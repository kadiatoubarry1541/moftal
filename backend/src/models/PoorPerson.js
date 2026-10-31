import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../../config/database.js';

class PoorPerson extends Model {
  // Méthodes statiques
  static async getVerifiedPoor() {
    return await this.findAll({
      where: { isVerified: true, isActive: true },
      order: [['created_at', 'DESC']]
    });
  }

  static async getPendingVerification() {
    return await this.findAll({
      where: { isVerified: false, isActive: true },
      order: [['created_at', 'DESC']]
    });
  }

  static async getPoorByRegion(region) {
    return await this.findAll({
      where: { region, isVerified: true, isActive: true },
      order: [['created_at', 'DESC']]
    });
  }

  static async searchPoor(query) {
    return await this.findAll({
      where: {
        isVerified: true,
        isActive: true,
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { region: { [Op.iLike]: `%${query}%` } },
          { city: { [Op.iLike]: `%${query}%` } },
          { situation: { [Op.iLike]: `%${query}%` } }
        ]
      },
      order: [['created_at', 'DESC']]
    });
  }
}

// Définition du modèle
PoorPerson.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  numeroH: {
    type: DataTypes.STRING,
    references: {
      model: 'users',
      key: 'numero_h'
    },
    comment: 'NumeroH si la personne est enregistrée'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  age: {
    type: DataTypes.INTEGER
  },
  gender: {
    type: DataTypes.STRING, // ENUM converti en STRING ('HOMME', 'FEMME', 'AUTRE'),
    defaultValue: 'AUTRE'
  },
  region: {
    type: DataTypes.STRING, // ENUM converti en STRING ('Basse-Guinée', 'Fouta-Djallon', 'Haute-Guinée', 'Guinée forestière'),
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT
  },
  phone: {
    type: DataTypes.STRING,
    comment: 'Numéro de téléphone si disponible'
  },
  situation: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Description de la situation de pauvreté'
  },
  religion: {
    type: DataTypes.STRING,
    comment: 'Religion de la personne (Islam, Christianisme, Croyance Traditionnelle, Autre)'
  },
  needs: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Besoins identifiés (nourriture, vêtements, médicaments, etc.)'
  },
  urgency: {
    type: DataTypes.STRING, // ENUM converti en STRING ('faible', 'moyenne', 'élevée', 'critique'),
    defaultValue: 'moyenne'
  },
  familySize: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Nombre de personnes dans la famille'
  },
  children: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Nombre d\'enfants'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_verified'
  },
  verifiedBy: {
    type: DataTypes.STRING,
    comment: 'NumeroH de l\'administrateur qui a vérifié'
  },
  verifiedAt: {
    type: DataTypes.DATE
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  donations: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Historique des dons reçus'
  },
  totalDonations: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Montant total des dons reçus'
  },
  lastDonation: {
    type: DataTypes.DATE,
    comment: 'Date du dernier don'
  },
  notes: {
    type: DataTypes.TEXT,
    comment: 'Notes additionnelles'
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NumeroH de l\'administrateur qui a créé l\'entrée'
  }
}, {
  sequelize,
  modelName: 'PoorPerson',
  tableName: 'poor_persons',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['region']
    },
    {
      fields: ['city']
    },
    {
      fields: ['is_verified', 'is_active']
    },
    {
      fields: ['urgency']
    },
    {
      fields: ['numero_h']
    },
    {
      fields: ['religion']
    }
  ]
});

export default PoorPerson;


