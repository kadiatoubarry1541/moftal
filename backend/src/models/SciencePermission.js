import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../../config/database.js';

class SciencePermission extends Model {
  // Méthodes statiques
  static async getUserPermissions(numeroH) {
    return await this.findAll({
      where: { 
        numeroH, 
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      },
      order: [['created_at', 'DESC']]
    });
  }

  static async checkPermission(numeroH) {
    const permission = await this.findOne({
      where: { 
        numeroH, 
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      }
    });
    return permission !== null;
  }
}

// Définition du modèle
SciencePermission.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  numeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'numero_h',
    references: {
      model: 'users',
      key: 'numero_h'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  grantedBy: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NumeroH de l\'administrateur qui a accordé la permission'
  },
  grantedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  expiresAt: {
    type: DataTypes.DATE,
    comment: 'Date d\'expiration de la permission (null = permanent)'
  },
  notes: {
    type: DataTypes.TEXT,
    comment: 'Notes sur la permission'
  }
}, {
  sequelize,
  modelName: 'SciencePermission',
  tableName: 'science_permissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['numero_h']
    },
    {
      fields: ['is_active']
    },
    {
      unique: true,
      fields: ['numero_h']
    }
  ]
});

export default SciencePermission;

