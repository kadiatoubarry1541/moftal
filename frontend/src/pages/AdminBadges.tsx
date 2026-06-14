import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { config } from '../config/api';
import { getSessionUser, isAdmin } from '../utils/auth';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  role: string;
  [key: string]: any;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  requirements: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

interface Logo {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  usageCount: number;
}

// Liste complète des métiers professionnels avec leurs icônes et catégories
const PROFESSIONAL_LOGOS = [
  // Santé & Médecine
  { name: 'Médecin', description: 'Professionnel de la médecine', icon: '👨‍⚕️', color: '#EF4444', category: 'sante' },
  { name: 'Infirmier/Infirmière', description: 'Professionnel des soins infirmiers', icon: '👩‍⚕️', color: '#F87171', category: 'sante' },
  { name: 'Pharmacien', description: 'Spécialiste des médicaments', icon: '💊', color: '#DC2626', category: 'sante' },
  { name: 'Dentiste', description: 'Spécialiste de la santé dentaire', icon: '🦷', color: '#FCA5A5', category: 'sante' },
  { name: 'Vétérinaire', description: 'Médecin pour animaux', icon: '🐕', color: '#991B1B', category: 'sante' },
  { name: 'Kinésithérapeute', description: 'Spécialiste de la rééducation', icon: '🏥', color: '#B91C1C', category: 'sante' },

  // Éducation & Formation
  { name: 'Étudiant', description: 'Étudiant en formation', icon: '🎓', color: '#3B82F6', category: 'education' },
  { name: 'Étudiante', description: 'Étudiante en formation', icon: '👩‍🎓', color: '#3B82F6', category: 'education' },
  { name: 'Élève', description: 'Élève en cours de scolarité', icon: '📚', color: '#60A5FA', category: 'education' },
  { name: 'Écolier/Écolière', description: 'Jeune élève à l\'école primaire', icon: '👦', color: '#2563EB', category: 'education' },
  { name: 'Lycéen/Lycéenne', description: 'Élève du lycée', icon: '👨‍🎓', color: '#1E40AF', category: 'education' },
  { name: 'Collégien/Collégienne', description: 'Élève du collège', icon: '🧒', color: '#1E3A8A', category: 'education' },
  { name: 'Étudiant universitaire', description: 'Étudiant à l\'université', icon: '🎓', color: '#1D4ED8', category: 'education' },
  { name: 'Chercheur', description: 'Chercheur scientifique', icon: '🔬', color: '#1E3A8A', category: 'education' },
  { name: 'Docteur (PhD)', description: 'Docteur en philosophie', icon: '🎓', color: '#1E40AF', category: 'education' },
  { name: 'Professeur', description: 'Enseignant', icon: '👨‍🏫', color: '#3B82F6', category: 'education' },
  { name: 'Enseignant', description: 'Professionnel de l\'enseignement', icon: '👩‍🏫', color: '#60A5FA', category: 'education' },
  { name: 'Formateur', description: 'Spécialiste de la formation professionnelle', icon: '📚', color: '#2563EB', category: 'education' },
  { name: 'Directeur d\'école', description: 'Administrateur éducatif', icon: '🏫', color: '#1E40AF', category: 'education' },
  { name: 'Bibliothécaire', description: 'Gestionnaire de bibliothèque', icon: '📖', color: '#1E3A8A', category: 'education' },
  { name: 'Professeur des écoles', description: 'Enseignant du primaire', icon: '👨‍🏫', color: '#2563EB', category: 'education' },
  { name: 'Professeur de collège/lycée', description: 'Enseignant du secondaire', icon: '👩‍🏫', color: '#1E40AF', category: 'education' },
  { name: 'Professeur d\'université', description: 'Enseignant-chercheur', icon: '🎓', color: '#1E3A8A', category: 'education' },
  { name: 'Maître de conférences', description: 'Enseignant-chercheur universitaire', icon: '📝', color: '#1D4ED8', category: 'education' },
  { name: 'Inspecteur d\'éducation', description: 'Inspecteur académique', icon: '🔍', color: '#1E40AF', category: 'education' },

  // Technologie & Informatique
  { name: 'Développeur', description: 'Programmeur informatique', icon: '💻', color: '#10B981', category: 'technologie' },
  { name: 'Ingénieur informatique', description: 'Spécialiste en systèmes informatiques', icon: '🔧', color: '#059669', category: 'technologie' },
  { name: 'Designer UX/UI', description: 'Designer d\'interfaces utilisateur', icon: '🎨', color: '#047857', category: 'technologie' },
  { name: 'Technicien informatique', description: 'Réparateur et mainteneur d\'ordinateurs', icon: '🖥️', color: '#065F46', category: 'technologie' },
  { name: 'Data Scientist', description: 'Analyste de données', icon: '📊', color: '#064E3B', category: 'technologie' },
  { name: 'Cybersécurité', description: 'Expert en sécurité informatique', icon: '🔒', color: '#022C22', category: 'technologie' },

  // Commerce & Vente & Entrepreneuriat
  { name: 'Entrepreneur', description: 'Entrepreneur', icon: '🚀', color: '#DC2626', category: 'commerce' },
  { name: 'Grand entrepreneur', description: 'Grand entrepreneur', icon: '🏢', color: '#B91C1C', category: 'commerce' },
  { name: 'Petit entrepreneur', description: 'Petit entrepreneur', icon: '💼', color: '#991B1B', category: 'commerce' },
  { name: 'Businessman', description: 'Homme d\'affaires', icon: '👔', color: '#7F1D1D', category: 'commerce' },
  { name: 'Businesswoman', description: 'Femme d\'affaires', icon: '👩‍💼', color: '#DC2626', category: 'commerce' },
  { name: 'Investisseur', description: 'Investisseur', icon: '💹', color: '#B91C1C', category: 'commerce' },
  { name: 'Grand commerçant', description: 'Grand commerçant', icon: '🏢', color: '#DC2626', category: 'commerce' },
  { name: 'Moyen commerçant', description: 'Moyen commerçant', icon: '🏪', color: '#F59E0B', category: 'commerce' },
  { name: 'Petit commerçant', description: 'Petit commerçant', icon: '🏬', color: '#FBBF24', category: 'commerce' },
  { name: 'Commerçant', description: 'Gérant de commerce', icon: '🏪', color: '#D97706', category: 'commerce' },
  { name: 'Vendeur/Vendeuse', description: 'Professionnel de la vente', icon: '🛒', color: '#FBBF24', category: 'commerce' },
  { name: 'Comptable', description: 'Gestionnaire comptable', icon: '📊', color: '#D97706', category: 'commerce' },
  { name: 'Commercial', description: 'Agent commercial', icon: '💼', color: '#92400E', category: 'commerce' },
  { name: 'Économiste', description: 'Expert en économie', icon: '📈', color: '#78350F', category: 'commerce' },
  { name: 'Banquier', description: 'Professionnel bancaire', icon: '🏦', color: '#451A03', category: 'commerce' },

  // Artisanat & Construction
  { name: 'Artisan', description: 'Artisan généraliste', icon: '🛠️', color: '#B45309', category: 'artisanat' },
  { name: 'Menuisier', description: 'Artisan du bois', icon: '🪵', color: '#A16207', category: 'artisanat' },
  { name: 'Plombier', description: 'Spécialiste de la plomberie', icon: '🔧', color: '#A16207', category: 'artisanat' },
  { name: 'Électricien', description: 'Spécialiste de l\'électricité', icon: '⚡', color: '#854D0E', category: 'artisanat' },
  { name: 'Maçon', description: 'Constructeur de bâtiments', icon: '🧱', color: '#713F12', category: 'artisanat' },
  { name: 'Peintre', description: 'Artisan peintre', icon: '🎨', color: '#5F3312', category: 'artisanat' },
  { name: 'Couturier/Couturière', description: 'Spécialiste de la couture', icon: '🧵', color: '#4D2810', category: 'artisanat' },
  { name: 'Forgeron', description: 'Artisan du métal', icon: '⚒️', color: '#42251A', category: 'artisanat' },

  // Transport & Logistique
  { name: 'Chauffeur', description: 'Conducteur professionnel', icon: '🚗', color: '#6366F1', category: 'transport' },
  { name: 'Pilote', description: 'Pilote d\'avion', icon: '✈️', color: '#818CF8', category: 'transport' },
  { name: 'Capitaine de navire', description: 'Commandant maritime', icon: '⛴️', color: '#4F46E5', category: 'transport' },
  { name: 'Logisticien', description: 'Gestionnaire logistique', icon: '📦', color: '#4338CA', category: 'transport' },

  // Agriculture & Environnement
  { name: 'Grand agriculteur', description: 'Grand exploitant agricole', icon: '🌾', color: '#16A34A', category: 'agriculture' },
  { name: 'Agriculteur', description: 'Exploitant agricole', icon: '🚜', color: '#22C55E', category: 'agriculture' },
  { name: 'Petit agriculteur', description: 'Petit exploitant agricole', icon: '🌱', color: '#4ADE80', category: 'agriculture' },
  { name: 'Éleveur', description: 'Éleveur d\'animaux', icon: '🐄', color: '#4ADE80', category: 'agriculture' },
  { name: 'Agronome', description: 'Expert en agriculture', icon: '🌾', color: '#16A34A', category: 'agriculture' },
  { name: 'Ingénieur agronome', description: 'Spécialiste des sciences agricoles', icon: '🌱', color: '#15803D', category: 'agriculture' },
  { name: 'Jardinier', description: 'Spécialiste des jardins', icon: '🌿', color: '#166534', category: 'agriculture' },

  // Droit & Justice
  { name: 'Avocat', description: 'Juriste et défenseur', icon: '⚖️', color: '#6B7280', category: 'droit' },
  { name: 'Juge', description: 'Magistrat', icon: '👨‍⚖️', color: '#4B5563', category: 'droit' },
  { name: 'Notaire', description: 'Officier ministériel', icon: '📜', color: '#374151', category: 'droit' },
  { name: 'Huissier', description: 'Officier ministériel', icon: '📋', color: '#1F2937', category: 'droit' },

  // Média & Communication
  { name: 'Journaliste', description: 'Rédacteur de presse', icon: '📰', color: '#EC4899', category: 'media' },
  { name: 'Photographe', description: 'Artiste photographe', icon: '📷', color: '#F472B6', category: 'media' },
  { name: 'Réalisateur', description: 'Créateur audiovisuel', icon: '🎬', color: '#DB2777', category: 'media' },
  { name: 'Animateur radio', description: 'Présentateur radio', icon: '📻', color: '#BE185D', category: 'media' },

  // Arts & Culture
  { name: 'Artiste', description: 'Créateur artistique', icon: '🎭', color: '#8B5CF6', category: 'art' },
  { name: 'Musicien', description: 'Artiste musicien', icon: '🎵', color: '#A78BFA', category: 'art' },
  { name: 'Écrivain', description: 'Auteur littéraire', icon: '✍️', color: '#7C3AED', category: 'art' },
  { name: 'Peintre artiste', description: 'Artiste peintre', icon: '🖼️', color: '#6D28D9', category: 'art' },

  // Sécurité & Protection
  { name: 'Policier', description: 'Agent de police', icon: '👮', color: '#3B82F6', category: 'securite' },
  { name: 'Gendarme', description: 'Membre de la gendarmerie', icon: '👮‍♂️', color: '#2563EB', category: 'securite' },
  { name: 'Sapeur-pompier', description: 'Pompier professionnel', icon: '🚒', color: '#EF4444', category: 'securite' },
  { name: 'Agent de sécurité', description: 'Garde de sécurité', icon: '🛡️', color: '#1E40AF', category: 'securite' },

  // Hôtellerie & Restauration
  { name: 'Restaurateur', description: 'Gérant de restaurant', icon: '🍽️', color: '#F97316', category: 'hotellerie' },
  { name: 'Chef cuisinier', description: 'Cuisinier professionnel', icon: '👨‍🍳', color: '#F97316', category: 'hotellerie' },
  { name: 'Serveur/Serveuse', description: 'Personnel de service', icon: '🍽️', color: '#FB923C', category: 'hotellerie' },
  { name: 'Hôtelier', description: 'Gestionnaire d\'hôtel', icon: '🏨', color: '#EA580C', category: 'hotellerie' },
  { name: 'Barman', description: 'Spécialiste des boissons', icon: '🍸', color: '#C2410C', category: 'hotellerie' },

  // Sport & Loisirs
  { name: 'Entraîneur sportif', description: 'Coach sportif', icon: '🏃', color: '#14B8A6', category: 'sport' },
  { name: 'Sportif professionnel', description: 'Athlète de haut niveau', icon: '⚽', color: '#2DD4BF', category: 'sport' },
  { name: 'Moniteur de sport', description: 'Enseignant sportif', icon: '🏋️', color: '#0D9488', category: 'sport' },

  // Ingénierie & Sciences
  { name: 'Ingénieur', description: 'Ingénieur généraliste', icon: '🔬', color: '#06B6D4', category: 'ingenierie' },
  { name: 'Architecte', description: 'Concepteur de bâtiments', icon: '🏛️', color: '#0891B2', category: 'ingenierie' },
  { name: 'Géologue', description: 'Expert en géologie', icon: '🌍', color: '#0E7490', category: 'ingenierie' },
  { name: 'Chimiste', description: 'Spécialiste en chimie', icon: '🧪', color: '#155E75', category: 'ingenierie' },
  { name: 'Physicien', description: 'Expert en physique', icon: '⚛️', color: '#164E63', category: 'ingenierie' },

  // Services publics & Politique
  { name: 'Président', description: 'Président de la République', icon: '👑', color: '#DC2626', category: 'service-public' },
  { name: 'Président du Conseil', description: 'Président du Conseil', icon: '👑', color: '#B91C1C', category: 'service-public' },
  { name: 'Premier Ministre', description: 'Premier Ministre', icon: '🏛️', color: '#991B1B', category: 'service-public' },
  { name: 'Ministre', description: 'Ministre', icon: '🏛️', color: '#DC2626', category: 'service-public' },
  { name: 'Secrétaire d\'État', description: 'Secrétaire d\'État', icon: '📋', color: '#B91C1B', category: 'service-public' },
  { name: 'Gouverneur', description: 'Gouverneur de région', icon: '🏛️', color: '#991B1B', category: 'service-public' },
  { name: 'Préfet', description: 'Préfet', icon: '👔', color: '#7F1D1D', category: 'service-public' },
  { name: 'Sous-préfet', description: 'Sous-préfet', icon: '👔', color: '#B91C1C', category: 'service-public' },
  { name: 'Maire', description: 'Maire', icon: '🏛️', color: '#DC2626', category: 'service-public' },
  { name: 'Adjoint au maire', description: 'Adjoint au maire', icon: '👔', color: '#B91C1C', category: 'service-public' },
  { name: 'Chef de quartier', description: 'Chef de quartier', icon: '👔', color: '#991B1B', category: 'service-public' },
  { name: 'Conseiller municipal', description: 'Conseiller municipal', icon: '👔', color: '#7F1D1D', category: 'service-public' },
  { name: 'Député', description: 'Député', icon: '🏛️', color: '#DC2626', category: 'service-public' },
  { name: 'Sénateur', description: 'Sénateur', icon: '🏛️', color: '#B91C1C', category: 'service-public' },
  { name: 'Ambassadeur', description: 'Ambassadeur', icon: '🌐', color: '#991B1B', category: 'service-public' },
  { name: 'Consul', description: 'Consul', icon: '🌐', color: '#7F1D1D', category: 'service-public' },
  { name: 'Diplomate', description: 'Diplomate', icon: '🤝', color: '#B91C1C', category: 'service-public' },
  { name: 'Fonctionnaire', description: 'Agent de l\'État', icon: '🏛️', color: '#64748B', category: 'service-public' },
  { name: 'Postier', description: 'Agent postal', icon: '📮', color: '#475569', category: 'service-public' },
  { name: 'Douanier', description: 'Agent des douanes', icon: '🛃', color: '#334155', category: 'service-public' },

  // Titres familiaux & Honorifiques
  { name: 'Ménagère', description: 'Ménagère', icon: '👩', color: '#EC4899', category: 'famille' },
  { name: 'Mère', description: 'Mère', icon: '👩', color: '#EC4899', category: 'famille' },
  { name: 'Père', description: 'Père', icon: '👨', color: '#3B82F6', category: 'famille' },
  { name: 'Grand-mère', description: 'Grand-mère', icon: '👵', color: '#F472B6', category: 'famille' },
  { name: 'Grand-père', description: 'Grand-père', icon: '👴', color: '#60A5FA', category: 'famille' },
  { name: 'Oncle', description: 'Oncle', icon: '👨', color: '#2563EB', category: 'famille' },
  { name: 'Tante', description: 'Tante', icon: '👩', color: '#DB2777', category: 'famille' },
  { name: 'Fils', description: 'Fils', icon: '👦', color: '#3B82F6', category: 'famille' },
  { name: 'Fille', description: 'Fille', icon: '👧', color: '#EC4899', category: 'famille' },
  { name: 'Époux', description: 'Époux/Mari', icon: '👨', color: '#3B82F6', category: 'famille' },
  { name: 'Épouse', description: 'Épouse/Femme', icon: '👩', color: '#EC4899', category: 'famille' },
  { name: 'Frère', description: 'Frère', icon: '👨', color: '#2563EB', category: 'famille' },
  { name: 'Sœur', description: 'Sœur', icon: '👩', color: '#DB2777', category: 'famille' },
  { name: 'Cousin', description: 'Cousin', icon: '👨', color: '#1E40AF', category: 'famille' },
  { name: 'Cousine', description: 'Cousine', icon: '👩', color: '#BE185D', category: 'famille' },
  { name: 'Neveu', description: 'Neveu', icon: '👦', color: '#2563EB', category: 'famille' },
  { name: 'Nièce', description: 'Nièce', icon: '👧', color: '#DB2777', category: 'famille' },
  { name: 'Chef de famille', description: 'Chef de famille', icon: '👨‍👩‍👧‍👦', color: '#DC2626', category: 'famille' },
  { name: 'Aîné', description: 'Aîné de la famille', icon: '👴', color: '#991B1B', category: 'famille' },
  { name: 'Aînée', description: 'Aînée de la famille', icon: '👵', color: '#BE185D', category: 'famille' },

  // Autres professions
  { name: 'Traducteur', description: 'Spécialiste de la traduction', icon: '🗣️', color: '#A855F7', category: 'autre' },
  { name: 'Traducteur interprète', description: 'Traducteur et interprète', icon: '🌐', color: '#9333EA', category: 'autre' },
  { name: 'Guide touristique', description: 'Accompagnateur touristique', icon: '🗺️', color: '#7E22CE', category: 'autre' },
  { name: 'Coiffeur/Coiffeuse', description: 'Professionnel de la coiffure', icon: '✂️', color: '#6B21A8', category: 'autre' },
  { name: 'Esthéticienne', description: 'Spécialiste de l\'esthétique', icon: '💅', color: '#581C87', category: 'autre' },

  // Éléments célestes & Nature
  { name: 'Soleil', description: 'Symbole du soleil', icon: '☀️', color: '#F59E0B', category: 'nature' },
  { name: 'Lune', description: 'Symbole de la lune', icon: '🌙', color: '#6366F1', category: 'nature' },
  { name: 'Lune pleine', description: 'Lune pleine', icon: '🌕', color: '#818CF8', category: 'nature' },
  { name: 'Lune croissante', description: 'Lune croissante', icon: '🌙', color: '#4F46E5', category: 'nature' },
  { name: 'Étoile', description: 'Symbole d\'étoile', icon: '⭐', color: '#FBBF24', category: 'nature' },
  { name: 'Étoiles', description: 'Plusieurs étoiles', icon: '✨', color: '#FCD34D', category: 'nature' },
  { name: 'Étoile filante', description: 'Étoile filante', icon: '☄️', color: '#F59E0B', category: 'nature' },
  { name: 'Comète', description: 'Comète', icon: '☄️', color: '#EF4444', category: 'nature' },
  { name: 'Nuage', description: 'Nuage', icon: '☁️', color: '#94A3B8', category: 'nature' },
  { name: 'Arc-en-ciel', description: 'Arc-en-ciel', icon: '🌈', color: '#EC4899', category: 'nature' },
  { name: 'Éclair', description: 'Éclair', icon: '⚡', color: '#FCD34D', category: 'nature' },
  { name: 'Pluie', description: 'Pluie', icon: '🌧️', color: '#60A5FA', category: 'nature' },
  { name: 'Neige', description: 'Neige', icon: '❄️', color: '#E0E7FF', category: 'nature' },
  { name: 'Boule de neige', description: 'Boule de neige', icon: '☃️', color: '#DBEAFE', category: 'nature' },
  { name: 'Vent', description: 'Vent', icon: '💨', color: '#A5B4FC', category: 'nature' },
  { name: 'Feu', description: 'Feu', icon: '🔥', color: '#EF4444', category: 'nature' },
  { name: 'Eau', description: 'Eau', icon: '💧', color: '#3B82F6', category: 'nature' },
  { name: 'Vague', description: 'Vague', icon: '🌊', color: '#2563EB', category: 'nature' },
  { name: 'Tornade', description: 'Tornade', icon: '🌪️', color: '#64748B', category: 'nature' },
  { name: 'Brouillard', description: 'Brouillard', icon: '🌫️', color: '#94A3B8', category: 'nature' },
  { name: 'Terre', description: 'Planète Terre', icon: '🌍', color: '#10B981', category: 'nature' },
  { name: 'Planète', description: 'Planète', icon: '🪐', color: '#6366F1', category: 'nature' },
  { name: 'Saturne', description: 'Planète Saturne', icon: '🪐', color: '#818CF8', category: 'nature' },
  { name: 'Galaxie', description: 'Galaxie', icon: '🌌', color: '#4C1D95', category: 'nature' },
  { name: 'Soucoupe volante', description: 'OVNI', icon: '🛸', color: '#6366F1', category: 'nature' },
  { name: 'Télescope', description: 'Télescope', icon: '🔭', color: '#3B82F6', category: 'nature' },
  { name: 'Lunette', description: 'Lunette d\'observation', icon: '🔭', color: '#2563EB', category: 'nature' },
];

interface PageAdmin {
  id: number;
  pagePath: string;
  pageName: string;
  adminNumeroH: string;
  assignedAt: string;
  isActive: boolean;
  admin?: {
    numeroH: string;
    prenom: string;
    nomFamille: string;
    photo?: string;
  };
}

export default function AdminBadges() {
  const [searchParams] = useSearchParams();
  const [userData, setUserData] = useState<UserData | null>(null);
  const tabParam = searchParams.get('tab');
  const initialTab = (tabParam === 'logos' ? 'logos' : tabParam === 'page-admins' ? 'page-admins' : 'badges') as 'badges' | 'logos' | 'page-admins';
  const [activeTab, setActiveTab] = useState<'badges' | 'logos' | 'page-admins'>(initialTab);
  const [pageAdmins, setPageAdmins] = useState<PageAdmin[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showPageAdminForm, setShowPageAdminForm] = useState(false);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [filteredLogos, setFilteredLogos] = useState<Logo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [editingLogo, setEditingLogo] = useState<Logo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [importing, setImporting] = useState(false);
  const [showAssignBadge, setShowAssignBadge] = useState(false);
  const [selectedUserForBadge, setSelectedUserForBadge] = useState<string>('');
  const [selectedBadgeToAssign, setSelectedBadgeToAssign] = useState<string>('');
  const [badgeReason, setBadgeReason] = useState<string>('');
  const navigate = useNavigate();

  const [newBadge, setNewBadge] = useState({
    name: '',
    description: '',
    category: 'achievement',
    icon: '🏆',
    color: '#3B82F6',
    requirements: ['']
  });

  const [newLogo, setNewLogo] = useState({
    name: '',
    description: '',
    category: 'profession',
    icon: '💼',
    color: '#3B82F6'
  });

  const [newPageAdmin, setNewPageAdmin] = useState({
    pagePath: '',
    pageName: '',
    adminNumeroH: ''
  });

  const availablePages = [
    { path: '/sante', name: 'Santé' },
    { path: '/education', name: 'Éducation' },
    { path: '/activite', name: 'Activité' },
    { path: '/famille', name: 'Famille' },
    { path: '/histoire-humanite', name: 'Histoire' },
    { path: '/pays', name: 'Pays' },
  ];

  const categories = [
    { value: 'all', label: 'Toutes les catégories' },
    { value: 'sante', label: 'Santé & Médecine' },
    { value: 'education', label: 'Éducation' },
    { value: 'technologie', label: 'Technologie' },
    { value: 'commerce', label: 'Commerce' },
    { value: 'artisanat', label: 'Artisanat' },
    { value: 'transport', label: 'Transport' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'droit', label: 'Droit' },
    { value: 'media', label: 'Média' },
    { value: 'art', label: 'Arts' },
    { value: 'securite', label: 'Sécurité' },
    { value: 'hotellerie', label: 'Hôtellerie' },
    { value: 'sport', label: 'Sport' },
    { value: 'ingenierie', label: 'Ingénierie' },
    { value: 'service-public', label: 'Service Public' },
    { value: 'famille', label: 'Famille & Titres' },
    { value: 'nature', label: 'Nature & Célestes' },
    { value: 'autre', label: 'Autres' },
    { value: 'profession', label: 'Profession' },
  ];

  // Mettre à jour l'onglet actif quand le paramètre tab change dans l'URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'logos' || tabParam === 'page-admins') {
      setActiveTab(tabParam as 'logos' | 'page-admins');
    } else {
      setActiveTab('badges');
    }
  }, [searchParams]);

  useEffect(() => {
    // Vérifier la session de manière plus robuste
    const user = getSessionUser();
    const token = localStorage.getItem("token");
    
    if (!user) {
      // Si pas de session mais token existe, l'utilisateur peut être connecté
      // Ne pas rediriger immédiatement, permettre l'accès si admin
      if (!token) {
      navigate("/login");
        setLoading(false);
        return;
      }
      // Si token existe mais pas de session, essayer de continuer
      // L'utilisateur peut être connecté mais la session peut être corrompue
      console.warn("Token trouvé mais session manquante - tentative de récupération");
      // Ne pas rediriger, permettre l'accès si c'est un admin
      // L'utilisateur pourra toujours accéder aux données via le token
      setLoading(false);
      return;
    }

    // Vérifier si c'est un admin
    if (!isAdmin(user)) {
      alert("Accès refusé - Privilèges administrateur requis");
      navigate("/moi");
      setLoading(false);
        return;
      }
      
      setUserData(user);
    // Charger toutes les données en parallèle pour améliorer les performances
    Promise.all([
      loadBadges(),
      loadLogos(),
      loadPageAdmins(),
      loadUsers()
    ]).finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    filterLogos();
  }, [logos, searchTerm, selectedCategory]);

  const filterLogos = () => {
    let filtered = logos;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(logo => logo.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(logo => 
        logo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        logo.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogos(filtered);
  };

  const loadBadges = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/badges`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBadges(data.badges || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des badges:', error);
    }
  };

  const loadLogos = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/logos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogos(data.logos || []);
        setFilteredLogos(data.logos || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des logos:', error);
    }
  };

  const loadPageAdmins = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/page-admins`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPageAdmins(data.pageAdmins || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des admins de page:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  const handleBulkImport = async () => {
    setImporting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/logos/bulk-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ logos: PROFESSIONAL_LOGOS })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`${data.created} logo(s) professionnel(s) importé(s) avec succès !${data.failed > 0 ? `\n${data.failed} échec(s).` : ''}`);
        setShowBulkImport(false);
        loadLogos();
      } else {
        alert('Erreur lors de l\'import : ' + data.message);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'import en masse');
    } finally {
      setImporting(false);
    }
  };

  const handleCreateBadge = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/badges`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newBadge)
      });

      if (response.ok) {
        alert('Badge créé avec succès !');
        setShowCreateForm(false);
        setNewBadge({ name: '', description: '', category: 'achievement', icon: '🏆', color: '#3B82F6', requirements: [''] });
        loadBadges();
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du badge');
    }
  };

  const handleCreateLogo = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/logos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newLogo)
      });

      if (response.ok) {
        alert('Logo créé avec succès !');
        setShowCreateForm(false);
        setNewLogo({ name: '', description: '', category: 'profession', icon: '💼', color: '#3B82F6' });
        loadLogos();
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du logo');
    }
  };

  const handleSubmit = () => {
    if (activeTab === 'badges') {
      handleCreateBadge();
    } else if (activeTab === 'logos') {
      handleCreateLogo();
    }
  };

  const handleAssignBadge = async () => {
    if (!selectedUserForBadge || !selectedBadgeToAssign) {
      alert('Veuillez sélectionner un utilisateur et un badge');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/badges/award`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numeroH: selectedUserForBadge,
          badgeId: selectedBadgeToAssign,
          reason: badgeReason || undefined
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(data.message || 'Badge attribué avec succès !');
        setShowAssignBadge(false);
        setSelectedUserForBadge('');
        setSelectedBadgeToAssign('');
        setBadgeReason('');
      } else {
        alert('Erreur : ' + (data.message || 'Impossible d\'attribuer le badge'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'attribution du badge');
    }
  };

  const handleAssignPageAdmin = async () => {
    if (!newPageAdmin.pagePath || !newPageAdmin.pageName || !newPageAdmin.adminNumeroH) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/page-admins`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPageAdmin)
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Chef de page assigné avec succès !');
        setShowPageAdminForm(false);
        setNewPageAdmin({ pagePath: '', pageName: '', adminNumeroH: '' });
        loadPageAdmins();
      } else {
        alert('Erreur : ' + data.message);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'assignation du chef de page');
    }
  };

  const handleRemovePageAdmin = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce chef de page ?')) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5002/api/page-admins/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Chef de page retiré avec succès !');
        loadPageAdmins();
      } else {
        alert('Erreur : ' + data.message);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du retrait du chef de page');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏆 Badges & Logos Professionnels</h1>
              <p className="mt-2 text-gray-600">Gestion des badges et logos professionnels pour distinguer vos utilisateurs</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/moi')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1 py-2">
            {[
              { id: 'badges', label: 'Badges', icon: '🏆' },
              { id: 'logos', label: 'Logos Professionnels', icon: '💼' },
              { id: 'page-admins', label: 'Chefs de Page', icon: '👑' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  // Mettre à jour l'URL avec le paramètre tab
                  const newSearchParams = new URLSearchParams(searchParams);
                  if (tab.id === 'badges') {
                    newSearchParams.delete('tab');
                  } else {
                    newSearchParams.set('tab', tab.id);
                  }
                  navigate(`/admin/badges?${newSearchParams.toString()}`, { replace: true });
                }}
                className={`flex flex-col items-center justify-center gap-1 px-2 py-2 sm:px-4 sm:py-3 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="text-base sm:text-lg">{tab.icon}</span>
                <span className="text-center leading-tight">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'logos' && (
          <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher un logo</label>
                <input
                  type="text"
                  placeholder="Rechercher par nom ou description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:w-64">
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkImport(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
              >
                📥 Importer Tous les Métiers ({PROFESSIONAL_LOGOS.length})
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
              >
                ➕ Créer un Logo
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {activeTab === 'badges' ? '🏆 Badges' : 
               activeTab === 'logos' ? `💼 Logos Professionnels (${filteredLogos.length})` :
               `👑 Chefs de Page (${pageAdmins.filter(pa => pa.isActive).length})`}
            </h2>
            {activeTab === 'badges' && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ➕ Créer
            </button>
            )}
            {activeTab === 'page-admins' && (
              <button
                onClick={() => setShowPageAdminForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ➕ Assigner un Chef
              </button>
            )}
          </div>

          {/* Liste des badges, logos ou admins de page */}
          {activeTab === 'page-admins' ? (
            <div className="space-y-4">
              {pageAdmins.filter(pa => pa.isActive).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">Aucun chef de page assigné</p>
                  <p className="text-gray-400 mt-2">Cliquez sur "Assigner un Chef" pour commencer</p>
                  <p className="text-gray-400 mt-1 text-sm">Vous pouvez assigner jusqu'à 2 chefs par page</p>
                </div>
              ) : (
                <div>
                  {/* Grouper par page */}
                  {Array.from(new Set(pageAdmins.filter(pa => pa.isActive).map(pa => pa.pagePath))).map(pagePath => {
                    const pageAdminsForPage = pageAdmins.filter(pa => pa.isActive && pa.pagePath === pagePath);
                    const pageName = pageAdminsForPage[0]?.pageName || pagePath;
                    
                    return (
                      <div key={pagePath} className="mb-6 border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-purple-50">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">👑 {pageName}</h3>
                            <p className="text-sm text-gray-600">Page: {pagePath}</p>
                          </div>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                            {pageAdminsForPage.length} / 2 chef{pageAdminsForPage.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {pageAdminsForPage.map((pageAdmin, index) => (
                            <div key={pageAdmin.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold shadow-lg">
                                  {pageAdmin.admin?.photo ? (
                                    <img
                                      src={pageAdmin.admin.photo}
                                      alt={pageAdmin.admin.prenom}
                                      className="w-full h-full rounded-full object-cover"
                                    />
                                  ) : (
                                    pageAdmin.admin?.prenom?.charAt(0) || "A"
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">{pageAdmin.admin?.prenom} {pageAdmin.admin?.nomFamille}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    {index === 0 ? (
                                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                                        Chef principal
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-semibold rounded-full">
                                        2ème chef
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                <span className="text-xs text-gray-500">NuméroH: {pageAdmin.adminNumeroH}</span>
                                <button
                                  onClick={() => handleRemovePageAdmin(pageAdmin.id)}
                                  className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 hover:bg-red-50 rounded"
                                >
                                  Retirer
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'badges' ? (
            <div>
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => setShowAssignBadge(true)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                >
                  🎯 Attribuer un Badge
                </button>
              </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {badges.map((badge) => (
                <div key={badge.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <h3 className="text-lg font-semibold">{badge.name}</h3>
                  <p className="text-sm text-gray-600">{badge.description}</p>
                  <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">{badge.category}</span>
                </div>
              ))}
              </div>
            </div>
          ) : (
            <>
              {filteredLogos.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">Aucun logo trouvé</p>
                  <p className="text-gray-400 mt-2">Cliquez sur "Importer Tous les Métiers" pour ajouter les logos professionnels</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredLogos.map((logo) => (
                    <div key={logo.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-4xl">{logo.icon}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{logo.usageCount} utilisateur(s)</span>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{logo.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{logo.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: `${logo.color}20`, color: logo.color }}>
                          {categories.find(c => c.value === logo.category)?.label || logo.category}
                        </span>
                      </div>
                </div>
              ))}
            </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal d'import en masse */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">📥 Importer tous les logos professionnels</h3>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                <strong>{PROFESSIONAL_LOGOS.length} logos professionnels</strong> seront importés avec leurs catégories :
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {Array.from(new Set(PROFESSIONAL_LOGOS.map(l => l.category))).map(cat => (
                  <div key={cat} className="bg-white px-2 py-1 rounded">
                    {categories.find(c => c.value === cat)?.label || cat}: {PROFESSIONAL_LOGOS.filter(l => l.category === cat).length}
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Les logos déjà existants seront ignorés. Cette action est irréversible.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBulkImport(false)}
                disabled={importing}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleBulkImport}
                disabled={importing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Import en cours...
                  </>
                ) : (
                  'Importer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de création */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Créer {activeTab === 'badges' ? 'un Badge' : 'un Logo Professionnel'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                <input
                  type="text"
                  value={activeTab === 'badges' ? newBadge.name : newLogo.name}
                  onChange={(e) => activeTab === 'badges' 
                    ? setNewBadge({...newBadge, name: e.target.value})
                    : setNewLogo({...newLogo, name: e.target.value})
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={activeTab === 'logos' ? 'Ex: Médecin' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={activeTab === 'badges' ? newBadge.description : newLogo.description}
                  onChange={(e) => activeTab === 'badges'
                    ? setNewBadge({...newBadge, description: e.target.value})
                    : setNewLogo({...newLogo, description: e.target.value})
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder={activeTab === 'logos' ? 'Ex: Professionnel de la médecine' : ''}
                />
              </div>
              {activeTab === 'logos' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                  <select
                    value={newLogo.category}
                    onChange={(e) => setNewLogo({...newLogo, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.filter(c => c.value !== 'all').map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icône (emoji)</label>
                <input
                  type="text"
                  value={activeTab === 'badges' ? newBadge.icon : newLogo.icon}
                  onChange={(e) => activeTab === 'badges'
                    ? setNewBadge({...newBadge, icon: e.target.value})
                    : setNewLogo({...newLogo, icon: e.target.value})
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={activeTab === 'logos' ? 'Ex: 👨‍⚕️' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
                <div className="flex gap-2">
                <input
                  type="color"
                  value={activeTab === 'badges' ? newBadge.color : newLogo.color}
                  onChange={(e) => activeTab === 'badges'
                    ? setNewBadge({...newBadge, color: e.target.value})
                    : setNewLogo({...newLogo, color: e.target.value})
                  }
                    className="w-16 h-10 border border-gray-300 rounded-lg"
                />
                  <input
                    type="text"
                    value={activeTab === 'badges' ? newBadge.color : newLogo.color}
                    onChange={(e) => activeTab === 'badges'
                      ? setNewBadge({...newBadge, color: e.target.value})
                      : setNewLogo({...newLogo, color: e.target.value})
                    }
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour assigner un chef de page */}
      {showPageAdminForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              👑 Assigner un Chef de Page
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Vous pouvez assigner jusqu'à 2 chefs par page (chef principal et chef suppléant)
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Page</label>
                <select
                  value={newPageAdmin.pagePath}
                  onChange={(e) => {
                    const selected = availablePages.find(p => p.path === e.target.value);
                    setNewPageAdmin({
                      ...newPageAdmin,
                      pagePath: e.target.value,
                      pageName: selected?.name || ''
                    });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner une page</option>
                  {availablePages.map(page => (
                    <option key={page.path} value={page.path}>{page.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom de la page</label>
                <input
                  type="text"
                  value={newPageAdmin.pageName}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">NuméroH de l'utilisateur</label>
                <input
                  type="text"
                  value={newPageAdmin.adminNumeroH}
                  onChange={(e) => setNewPageAdmin({...newPageAdmin, adminNumeroH: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: G0C0P0R0E0F0 0"
                />
              </div>
              {users.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ou sélectionner un utilisateur</label>
                  <select
                    value={newPageAdmin.adminNumeroH}
                    onChange={(e) => setNewPageAdmin({...newPageAdmin, adminNumeroH: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un utilisateur</option>
                    {users.map(user => (
                      <option key={user.numeroH} value={user.numeroH}>
                        {user.prenom} {user.nomFamille} ({user.numeroH})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowPageAdminForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAssignPageAdmin}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Assigner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'attribution de badge */}
      {showAssignBadge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 Attribuer un Badge</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Utilisateur</label>
                <select
                  value={selectedUserForBadge}
                  onChange={(e) => setSelectedUserForBadge(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un utilisateur</option>
                  {users.map((user) => (
                    <option key={user.numeroH} value={user.numeroH}>
                      {user.prenom} {user.nomFamille} ({user.numeroH})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Badge</label>
                <select
                  value={selectedBadgeToAssign}
                  onChange={(e) => setSelectedBadgeToAssign(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un badge</option>
                  {badges.map((badge) => (
                    <option key={badge.id} value={badge.id}>
                      {badge.icon} {badge.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Raison (optionnel)</label>
                <textarea
                  value={badgeReason}
                  onChange={(e) => setBadgeReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Pourquoi ce badge est attribué..."
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignBadge(false);
                  setSelectedUserForBadge('');
                  setSelectedBadgeToAssign('');
                  setBadgeReason('');
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAssignBadge}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                🎯 Attribuer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
