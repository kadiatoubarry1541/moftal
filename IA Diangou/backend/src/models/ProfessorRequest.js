import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';
import Professor from './Professor.js';

class ProfessorRequest extends Model {
  // Méthodes statiques
  static async getUserRequests(numeroH) {
    return await this.findAll({
      where: { numeroH },
      include: [{
        model: Professor,
        as: 'professor'
      }],
      order: [['created_at', 'DESC']]
    });
  }

  static async getProfessorRequests(professorId) {
    return await this.findAll({
      where: { professorId },
      order: [['created_at', 'DESC']]
    });
  }
}

// Définition du modèle
ProfessorRequest.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  professorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'professors',
      key: 'id'
    }
  },
  numeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'numero_h'
    }
  },
  status: {
    type: DataTypes.STRING, // ENUM converti en STRING ('pending', 'approved', 'rejected', 'completed'),
    defaultValue: 'pending'
  },
  requestMessage: {
    type: DataTypes.TEXT,
    comment: 'Message de demande de l\'étudiant'
  },
  responseMessage: {
    type: DataTypes.TEXT,
    comment: 'Réponse du professeur'
  },
  requestedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  respondedAt: {
    type: DataTypes.DATE
  },
  scheduledDate: {
    type: DataTypes.DATE,
    comment: 'Date prévue pour le cours'
  },
  duration: {
    type: DataTypes.INTEGER,
    comment: 'Durée en minutes'
  }
}, {
  sequelize,
  modelName: 'ProfessorRequest',
  tableName: 'diangou_professor_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['professorId']
    },
    {
      fields: ['numeroH']
    },
    {
      fields: ['status']
    }
  ]
});

export default ProfessorRequest;

