import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../../config/database.js';

class ActivityGroup extends Model {
  static async getUserGroups(numeroH) {
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
ActivityGroup.init({
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
  activity: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Type d\'activité (activite1, activite2, activite3)'
  },
  members: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Liste des NumeroH des membres'
  },
  posts: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Publications du Organisation'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NumeroH du créateur'
  },
  pays: {
    type: DataTypes.STRING,
    defaultValue: '',
    comment: 'Pays du groupe — chaque pays a ses propres groupes par activité'
  },
  region: {
    type: DataTypes.STRING,
    defaultValue: '',
    comment: 'Région optionnelle pour sous-groupes géographiques'
  }
}, {
  sequelize,
  modelName: 'ActivityGroup',
  tableName: 'activity_groups',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['activity'] },
    { fields: ['is_active'] },
    { fields: ['pays'] }
  ]
});

export default ActivityGroup;