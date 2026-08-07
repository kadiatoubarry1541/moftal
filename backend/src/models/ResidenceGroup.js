import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class ResidenceGroup extends Model {
  // Méthodes d'instance
  getMemberCount() {
    return this.members ? this.members.length : 0;
  }

  // Méthodes statiques
  static async findByLocation(location) {
    return await this.findAll({
      where: { location },
      order: [['created_at', 'DESC']]
    });
  }

  static async getLocationStats() {
    const locations = await this.findAll({
      attributes: ['location'],
      group: ['location']
    });

    const stats = await Promise.all(
      locations.map(async (location) => {
        const count = await this.count({
          where: { location: location.location }
        });
        return {
          location: location.location,
          groupCount: count
        };
      })
    );

    return stats;
  }
}

// Définition du modèle
ResidenceGroup.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Type de lieu (Lieu de residence1, Lieu de residence2, Lieu de residence3, prefecture, sous_prefecture)'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Titre du Organisation de lieu'
  },
  description: {
    type: DataTypes.TEXT,
    comment: 'Description du Organisation'
  },
  members: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Liste des NumeroH des membres'
  },
  admin: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NumeroH de l\'administrateur du Organisation'
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'logo_url',
    comment: 'URL du logo du groupe, uploadé par son administrateur'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      allowNewMembers: true,
      requireApproval: false,
      allowMessages: true,
      allowMedia: true
    }
  }
}, {
  sequelize,
  modelName: 'ResidenceGroup',
  tableName: 'residence_groups',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['location']
    },
    {
      fields: ['admin']
    },
    {
      fields: ['is_active']
    }
  ]
});

export default ResidenceGroup;


