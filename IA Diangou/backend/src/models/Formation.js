import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';
import FormationRegistration from './FormationRegistration.js';

class Formation extends Model {
  // Méthodes d'instance
  getStudentCount() {
    return this.students ? this.students.length : 0;
  }

  // Méthodes statiques
  static async getAvailableFormations() {
    return await this.findAll({
      where: { isActive: true },
      order: [['created_at', 'DESC']]
    });
  }

  static async getFormationStats() {
    const formations = await this.findAll({
      attributes: ['id', 'title', 'category'],
      include: [{
        model: FormationRegistration,
        as: 'registrations',
        attributes: ['id']
      }]
    });

    return formations.map(formation => ({
      id: formation.id,
      title: formation.title,
      category: formation.category,
      studentCount: formation.registrations ? formation.registrations.length : 0
    }));
  }
}

// Définition du modèle
Formation.init({
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
    type: DataTypes.TEXT
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER,
    comment: 'Durée en mois'
  },
  level: {
    type: DataTypes.STRING,
    defaultValue: 'débutant'
  },
  requirements: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Prérequis pour la formation'
  },
  curriculum: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Programme de la formation'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NumeroH de l\'administrateur qui a créé la formation',
    field: 'created_by'
  },
  maxStudents: {
    type: DataTypes.INTEGER,
    comment: 'Nombre maximum d\'étudiants'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Prix de la formation'
  }
}, {
  sequelize,
  modelName: 'Formation',
  tableName: 'diangou_formations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['category']
    },
    {
      fields: ['is_active']
    }
  ]
});

export default Formation;

