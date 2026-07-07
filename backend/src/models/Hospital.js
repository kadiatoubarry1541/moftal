import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class Hospital extends Model {
  // Méthodes statiques
  static async getHospitalsByRegion(region) {
    return await this.findAll({
      where: { region, isActive: true },
      order: [['name', 'ASC']]
    });
  }

  static async searchHospitals(query) {
    return await this.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { region: { [Op.iLike]: `%${query}%` } },
          { city: { [Op.iLike]: `%${query}%` } }
        ]
      },
      order: [['name', 'ASC']]
    });
  }
}

// Définition du modèle
Hospital.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING, // ENUM converti en STRING ('hôpital', 'clinique', 'centre de santé', 'dispensaire'),
    allowNull: false
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
    type: DataTypes.TEXT,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    comment: 'Numéro de téléphone principal'
  },
  emergencyPhone: {
    type: DataTypes.STRING,
    comment: 'Numéro d\'urgence'
  },
  services: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Services disponibles'
  },
  specialties: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Spécialités médicales'
  },
  coordinates: {
    type: DataTypes.JSON,
    comment: 'Coordonnées GPS {lat, lng}'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isEmergency: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_emergency',
    comment: 'Dispose d\'un service d\'urgence'
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
    comment: 'Note moyenne (0-5)'
  },
  reviews: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Avis des patients'
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NumeroH de l\'administrateur qui a créé l\'hôpital'
  }
}, {
  sequelize,
  modelName: 'Hospital',
  tableName: 'hospitals',
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
      fields: ['is_active', 'is_emergency']
    }
  ]
});

export default Hospital;


