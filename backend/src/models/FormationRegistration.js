import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class FormationRegistration extends Model {
  // Méthodes statiques
  static async getUserRegistrations(numeroH) {
    return await this.findAll({
      where: { numeroH },
      include: [{
        model: this.sequelize.models.Formation,
        as: 'formation'
      }],
      order: [['created_at', 'DESC']]
    });
  }

  static async getFormationRegistrations(formationId) {
    return await this.findAll({
      where: { formationId },
      order: [['created_at', 'DESC']]
    });
  }
}

// Définition du modèle
FormationRegistration.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  formationId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'formation_id',
    references: {
      model: 'formations',
      key: 'id'
    }
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
  status: {
    type: DataTypes.STRING, // ENUM converti en STRING ('pending', 'approved', 'rejected', 'completed', 'dropped'),
    defaultValue: 'pending'
  },
  registeredAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  approvedAt: {
    type: DataTypes.DATE
  },
  completedAt: {
    type: DataTypes.DATE
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Pourcentage de progression (0-100)'
  },
  notes: {
    type: DataTypes.TEXT,
    comment: 'Notes de l\'administrateur'
  }
}, {
  sequelize,
  modelName: 'FormationRegistration',
  tableName: 'formation_registrations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['formation_id', 'numero_h']
    },
    {
      fields: ['status']
    }
  ]
});

export default FormationRegistration;


