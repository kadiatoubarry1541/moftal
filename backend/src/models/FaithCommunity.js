import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../../config/database.js';

class FaithCommunity extends Model {
  static async getUserCommunities(numeroH) {
    return await this.findAll({
      where: {
        members: {
          [Op.contains]: [numeroH]
        }
      },
      order: [['created_at', 'DESC']]
    });
  }
}

// Définition du modèle
FaithCommunity.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  religion: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Religion de la communauté'
  },
  members: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Liste des NumeroH des membres'
  },
  posts: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Publications de la communauté'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NumeroH du créateur'
  }
}, {
  sequelize,
  modelName: 'FaithCommunity',
  tableName: 'faith_communities',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['religion']
    },
    {
      fields: ['is_active']
    }
  ]
});

export default FaithCommunity;