import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

// Modèle pour les sections historiques
export const HistorySection = sequelize.define('HistorySection', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  videos: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  documents: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  category: {
    type: DataTypes.STRING, // ENUM converti en STRING ('prehistoire', 'antiquite', 'moyen-age', 'moderne', 'contemporain')
    allowNull: false
  },
  period: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  importance: {
    type: DataTypes.STRING, // ENUM converti en STRING ('low', 'medium', 'high')
    defaultValue: 'medium'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'history_sections',
  timestamps: true,
  underscored: false
});

// Modèle pour les membres de la famille
export const FamilyMember = sequelize.define('FamilyMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  numeroH: {
    type: DataTypes.STRING,
    allowNull: false
  },
  prenom: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nomFamille: {
    type: DataTypes.STRING,
    allowNull: false
  },
  relation: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING
  },
  email: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.STRING
  },
  birthDate: {
    type: DataTypes.DATE
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'family_members',
  timestamps: true,
  underscored: false
});

// Modèle pour l'arbre généalogique
export const FamilyTree = sequelize.define('FamilyTree', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  rootMember: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NumeroH du membre racine de l\'arbre'
  },
  // Identifiants uniques pour former l'arbre automatiquement
  numeroHPere: {
    type: DataTypes.STRING,
    comment: 'NumeroH du père (pour regrouper les arbres)'
  },
  numeroHMere: {
    type: DataTypes.STRING,
    comment: 'NumeroH de la mère (pour regrouper les arbres)'
  },
  // Chefs de famille (2 par arbre)
  chefFamille1: {
    type: DataTypes.STRING,
    comment: 'NumeroH du premier chef de famille'
  },
  chefFamille2: {
    type: DataTypes.STRING,
    comment: 'NumeroH du deuxième chef de famille'
  },
  members: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Liste des membres de l\'arbre (NumeroH)'
  },
  deceasedMembers: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Liste des décédés dans l\'arbre (NumeroHD)'
  },
  // Code unique de l'arbre : F<NomFamille>S<bloodNumber> (attribué dès 10 membres)
  familyCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'Code unique ex: F2S1 — attribué automatiquement dès 10 membres'
  },
  bloodNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Numéro de sang (S) — gelé et masqué jusqu\'à 10 membres'
  },
  familyName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nom de famille de la lignée (F) — extrait du rootMember'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  arbreActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'true après paiement d\'activation au propriétaire du site'
  },
  activationPaiementRef: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Référence du paiement d\'activation (txRef FedaPay)'
  }
}, {
  tableName: 'family_trees',
  timestamps: true,
  underscored: false
});

// Modèle pour les documents
export const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING, // ENUM converti en STRING ('birth_certificate', 'marriage_certificate', 'death_certificate', 'identity_card', 'passport', 'other')
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_url'
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_name'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'file_size'
  },
  uploadedBy: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'uploaded_by'
  },
  uploadedByName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'uploaded_by_name'
  },
  recipient: {
    type: DataTypes.STRING,
    field: 'recipient'
  },
  recipientName: {
    type: DataTypes.STRING,
    field: 'recipient_name'
  },
  status: {
    type: DataTypes.STRING, // ENUM converti en STRING ('pending', 'approved', 'rejected')
    defaultValue: 'pending',
    field: 'status'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_public'
  },
  category: {
    type: DataTypes.STRING, // ENUM converti en STRING ('civil', 'administrative', 'legal', 'other')
    allowNull: false,
    field: 'category'
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'tags'
  }
}, {
  tableName: 'documents',
  timestamps: true,
  underscored: false
});

// Modèle pour les appels d'urgence
export const EmergencyCall = sequelize.define('EmergencyCall', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  caller: {
    type: DataTypes.STRING,
    allowNull: false
  },
  callerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  coordinates: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  emergencyType: {
    type: DataTypes.STRING, // ENUM converti en STRING ('medical', 'fire', 'police', 'other')
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING, // ENUM converti en STRING ('pending', 'in_progress', 'resolved')
    defaultValue: 'pending'
  },
  assignedAgent: {
    type: DataTypes.STRING
  },
  resolvedAt: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'emergency_calls',
  timestamps: true,
  underscored: false
});

// Modèle pour les vérifications de localisation
export const LocationCheck = sequelize.define('LocationCheck', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  destination: {
    type: DataTypes.STRING,
    allowNull: false
  },
  coordinates: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  safetyLevel: {
    type: DataTypes.STRING, // ENUM converti en STRING ('safe', 'moderate', 'risky', 'dangerous')
    allowNull: false
  },
  recommendations: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  checkedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'location_checks',
  timestamps: true,
  underscored: false
});

// Modèle pour les dons
export const Donation = sequelize.define('Donation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  donor: {
    type: DataTypes.STRING,
    allowNull: false
  },
  donorName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  recipient: {
    type: DataTypes.STRING,
    allowNull: false
  },
  recipientName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'FG'
  },
  type: {
    type: DataTypes.STRING, // ENUM converti en STRING ('money', 'food', 'clothing', 'medicine', 'other')
    allowNull: false
  },
  donationType: {
    type: DataTypes.STRING, // 'zakat' ou 'sadaqah'
    defaultValue: 'sadaqah',
    comment: 'Type de don : zakat (aumône obligatoire pour musulmans) ou sadaqah (aumône facultative)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING, // ENUM converti en STRING ('pending', 'completed', 'cancelled')
    defaultValue: 'pending'
  },
  completedAt: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'donations',
  timestamps: true,
  underscored: false
});

// Modèle pour les calculs de zakat
export const ZakatCalculation = sequelize.define('ZakatCalculation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  totalWealth: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'FG'
  },
  zakatAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  calculatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  isPaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  paidAt: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'zakat_calculations',
  timestamps: true,
  underscored: false
});

// Relations
FamilyTree.hasMany(FamilyMember, { as: 'familyMembers', foreignKey: 'treeId' });
FamilyMember.belongsTo(FamilyTree, { as: 'tree', foreignKey: 'treeId' });

export default {
  HistorySection,
  FamilyMember,
  FamilyTree,
  Document,
  EmergencyCall,
  LocationCheck,
  Donation,
  ZakatCalculation
};










