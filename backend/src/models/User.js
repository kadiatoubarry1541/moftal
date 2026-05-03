import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../../config/database.js';

class User extends Model {
  // Méthodes d'instance
  getFullName() {
    return `${this.prenom} ${this.nomFamille}`;
  }

  getAge() {
    if (this.dateNaissance) {
      const today = new Date();
      const birthDate = new Date(this.dateNaissance);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
    return null;
  }

  // Méthodes statiques
  static async findByNumeroH(numeroH) {
    if (!numeroH || typeof numeroH !== 'string') return null;
    const normalizedNumeroH = numeroH.trim().replace(/\s+/g, ' ');
    const trimmed = numeroH.trim();
    try {
      // Au plus 2 requêtes : index sur numero_h → réponse rapide
      let user = await this.findOne({ where: { numeroH: { [Op.iLike]: normalizedNumeroH } }, raw: false });
      if (!user && trimmed !== normalizedNumeroH) {
        user = await this.findOne({ where: { numeroH: { [Op.iLike]: trimmed } }, raw: false });
      }
      return user || null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('findByNumeroH:', error.message);
      return null;
    }
  }

  static async findByType(type) {
    return await this.findAll({ where: { type } });
  }

  static async findByFamily(nomFamille) {
    return await this.findAll({ where: { nomFamille } });
  }
}

// Définition du modèle
User.init({
  // Identifiants principaux
  numeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
    field: 'numero_h'
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING, // ENUM converti en STRING ('vivant', 'defunt')
    defaultValue: 'vivant'
  },
  
  // Informations personnelles
  prenom: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nomFamille: {
    type: DataTypes.STRING,
    allowNull: false
  },
  genre: {
    type: DataTypes.STRING, // ENUM converti en STRING ('FEMME', 'HOMME', 'AUTRE')
    defaultValue: 'AUTRE'
  },
  dateNaissance: {
    type: DataTypes.DATEONLY
  },
  
  // Informations familiales
  famillePere: {
    type: DataTypes.STRING
  },
  prenomPere: {
    type: DataTypes.STRING
  },
  pereStatut: {
    type: DataTypes.STRING, // ENUM converti en STRING ('Vivant', 'Mort')
  },
  numeroHPere: {
    type: DataTypes.STRING,
    field: 'numero_h_pere'
  },
  familleMere: {
    type: DataTypes.STRING
  },
  prenomMere: {
    type: DataTypes.STRING
  },
  mereStatut: {
    type: DataTypes.STRING, // ENUM converti en STRING ('Vivant', 'Mort')
  },
  numeroHMere: {
    type: DataTypes.STRING,
    field: 'numero_h_mere'
  },
  
  // Informations géographiques et ethniques
  ethnie: {
    type: DataTypes.STRING
  },
  regionOrigine: {
    type: DataTypes.STRING
  },
  pays: {
    type: DataTypes.STRING
  },
  origine: {
    type: DataTypes.STRING
  },
  nationalite: {
    type: DataTypes.STRING
  },
  lieuNaissance: {
    type: DataTypes.STRING,
    field: 'lieu_naissance'
  },
  rangNaissance: {
    type: DataTypes.STRING,
    field: 'rang_naissance'
  },
  
  // Informations calculées
  generation: {
    type: DataTypes.STRING
  },
  decet: {
    type: DataTypes.STRING
  },
  age: {
    type: DataTypes.INTEGER
  },
  anneesAvantNaissance: {
    type: DataTypes.INTEGER,
    field: 'annees_avant_naissance'
  },
  
  // Identifiant secondaire unique (numéro Diangou)
  numeroD: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    field: 'numero_d'
  },

  // Informations de contact
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  tel1: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  tel2: {
    type: DataTypes.STRING
  },
  
  // Informations sociales
  statutSocial: {
    type: DataTypes.STRING, // ENUM converti en STRING ('Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve', 'Concubinage', 'Séparé(e)', 'Autre')
    defaultValue: 'Célibataire'
  },
  religion: {
    type: DataTypes.STRING
  },
  situationEco: {
    type: DataTypes.STRING, // ENUM converti en STRING ('Riche', 'Pauvre', 'Moyen', 'Gens de droits')
    defaultValue: 'Moyen'
  },
  
  // Informations de santé
  etatPhysique: {
    type: DataTypes.STRING,
    field: 'etat_physique'
  },
  situationSanitaire: {
    type: DataTypes.STRING,
    field: 'situation_sanitaire'
  },
  
  // Langues (stockées comme JSON)
  langues: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  languesAutre: {
    type: DataTypes.STRING
  },
  
  // Médias
  photo: {
    // Utiliser TEXT pour supporter les longues données (ex: base64)
    type: DataTypes.TEXT,
  },
  video: {
    // Utiliser TEXT pour supporter les longues données (ex: base64)
    type: DataTypes.TEXT,
  },
  fingerprint: {
    type: DataTypes.TEXT, // Données biométriques
  },
  preuve: {
    type: DataTypes.STRING, // Document de preuve (acte de décès, etc.)
  },
  // Photos de famille
  familyPhoto: {
    type: DataTypes.STRING, // Photo de famille
    field: 'family_photo'
  },
  manPhoto: {
    type: DataTypes.STRING, // Photo de l'homme (utilisateur)
    field: 'man_photo'
  },
  wifePhoto: {
    type: DataTypes.STRING, // Photo de la femme
    field: 'wife_photo'
  },
  childrenPhotos: {
    type: DataTypes.TEXT, // Photos des enfants (JSON stringifié)
    field: 'children_photos'
  },
  galleryAlbums: {
    type: DataTypes.TEXT, // Galerie famille par albums (JSON stringifié)
    field: 'gallery_albums',
    defaultValue: null
  },

  // Informations pour les défunts
  dateDeces: {
    type: DataTypes.DATEONLY,
    field: 'date_deces'
  },
  anneeDeces: {
    type: DataTypes.INTEGER,
    field: 'annee_deces'
  },
  lieuDeces: {
    type: DataTypes.STRING,
    field: 'lieu_deces'
  },
  ageObtenu: {
    type: DataTypes.INTEGER,
    field: 'age_obtenu',
    comment: 'Âge au moment du décès'
  },
  anneesDepuisDeces: {
    type: DataTypes.INTEGER,
    field: 'annees_depuis_deces',
    comment: 'Nombre d\'années depuis le décès'
  },
  
  // Relations familiales
  nbFreresMere: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbSoeursMere: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbFreresPere: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbSoeursPere: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbFilles: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbGarcons: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbTantesMaternelles: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbTantesPaternelles: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbOnclesMaternels: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbOnclesPaternels: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbCousins: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbCousines: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbFemmes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'nb_femmes',
    comment: 'Nombre d\'épouses (pour les hommes)'
  },
  
  // Activités professionnelles
  activite1: {
    type: DataTypes.STRING
  },
  activite2: {
    type: DataTypes.STRING
  },
  activite3: {
    type: DataTypes.STRING
  },
  
  // Lieux de résidence
  lieu1: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Non spécifié'
  },
  lieu2: {
    type: DataTypes.STRING
  },
  lieu3: {
    type: DataTypes.STRING
  },
  
  // Nouveaux champs géographiques
  prefecture: {
    type: DataTypes.STRING
  },
  sousPrefecture: {
    type: DataTypes.STRING,
    field: 'sous_prefecture'
  },
  lieuResidence1: {
    type: DataTypes.STRING,
    field: 'lieu_residence_1'
  },
  lieuResidence2: {
    type: DataTypes.STRING,
    field: 'lieu_residence_2'
  },
  lieuResidence3: {
    type: DataTypes.STRING,
    field: 'lieu_residence_3'
  },
  
  // Portefeuille/Wallet
  wallet: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: 'Solde du portefeuille utilisateur'
  },
  walletCurrency: {
    type: DataTypes.STRING,
    defaultValue: 'GNF',
    comment: 'Devise du portefeuille'
  },

  // Visibilité dans l'arbre : ce que les autres voient de moi (name_only | name_photo | name_photo_numeroH)
  treeVisibility: {
    type: DataTypes.STRING,
    defaultValue: 'name_photo_numeroH',
    field: 'tree_visibility'
  },
  // Personnes masquées dans mon arbre (liste de numeroH) : je ne les vois plus dans mon arbre
  treeHidden: {
    type: DataTypes.JSON,
    defaultValue: () => [],
    field: 'tree_hidden',
    comment: 'NumeroH des personnes à ne plus afficher dans mon arbre (masquées de ma visibilité)'
  },

  // Métadonnées
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_verified'
  },
  role: {
    type: DataTypes.STRING, // ENUM converti en STRING ('user', 'admin', 'super-admin')
    defaultValue: 'user'
  },
  children: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  parents: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  lastLogin: {
    type: DataTypes.DATE
  },
  // Histoires utilisateur (7 sections inspirées de la vie du Prophète)
  userStories: {
    type: DataTypes.TEXT, // Stocké comme JSON stringifié
    defaultValue: '{}',
    comment: 'Histoires personnelles de l\'utilisateur en 7 sections'
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    // On référence ici les noms de colonnes SQL réels (snake_case)
    { unique: true, fields: ['numero_h'] },
    { unique: true, fields: ['numero_d'] },
    { unique: true, fields: ['email'] },
    { unique: true, fields: ['tel1'] },
    { fields: ['numero_h_pere'] },
    { fields: ['numero_h_mere'] },
    { fields: ['type'] },
    { fields: ['nom_famille'] },
    { fields: ['prenom'] },
    { fields: ['generation'] },
    { fields: ['pays', 'region_origine', 'ethnie'] }
  ]
});

// Hooks
User.beforeSave(async (user) => {
  // Calculer l'âge automatiquement
  if (user.dateNaissance) {
    user.age = user.getAge();
  }
});

export default User;