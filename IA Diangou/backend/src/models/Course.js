import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class Course extends Model {
  // Méthodes d'instance
  getStudentCount() {
    return this.students ? this.students.length : 0;
  }

  // Méthodes statiques
  static async getUserCourses(numeroH) {
    return await this.findAll({
      where: { numeroH },
      order: [['created_at', 'DESC']]
    });
  }

  static async getCoursesByType(type) {
    return await this.findAll({
      where: { type, isActive: true },
      order: [['created_at', 'DESC']]
    });
  }
}

// Définition du modèle
Course.init({
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
  type: {
    type: DataTypes.STRING, // ENUM converti en STRING ('audio', 'video', 'written', 'library'),
    allowNull: false
  },
  content: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Contenu du cours (URLs, textes, etc.)'
  },
  duration: {
    type: DataTypes.INTEGER,
    comment: 'Durée en minutes'
  },
  level: {
    type: DataTypes.STRING, // ENUM converti en STRING ('débutant', 'intermédiaire', 'avancé'),
    defaultValue: 'débutant'
  },
  category: {
    type: DataTypes.STRING,
    comment: 'Catégorie du cours'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NumeroH de l\'administrateur qui a créé le cours'
  },
  students: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Liste des NumeroH des étudiants inscrits'
  },
  prerequisites: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Prérequis pour suivre le cours'
  }
}, {
  sequelize,
  modelName: 'Course',
  tableName: 'diangou_courses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['category']
    },
    {
      fields: ['is_active']
    }
  ]
});

export default Course;

