import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';
import ProfessorRequest from './ProfessorRequest.js';

class Professor extends Model {
  // Méthodes d'instance
  getStudentCount() {
    return this.students ? this.students.length : 0;
  }

  getRating() {
    if (!this.ratings || this.ratings.length === 0) return 0;
    const sum = this.ratings.reduce((acc, rating) => acc + rating.value, 0);
    return sum / this.ratings.length;
  }

  // Méthodes statiques
  static async getAvailableProfessors() {
    return await this.findAll({
      where: { isActive: true, isAvailable: true },
      order: [['created_at', 'DESC']]
    });
  }

  static async getProfessorStats() {
    const professors = await this.findAll({
      attributes: ['id', 'name', 'specialty', 'experience'],
      include: [{
        model: ProfessorRequest,
        as: 'requests',
        attributes: ['id']
      }]
    });

    return professors.map(professor => ({
      id: professor.id,
      name: professor.name,
      specialty: professor.specialty,
      experience: professor.experience,
      requestCount: professor.requests ? professor.requests.length : 0
    }));
  }
}

// Définition du modèle
Professor.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  specialty: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Spécialité du professeur'
  },
  experience: {
    type: DataTypes.INTEGER,
    comment: 'Années d\'expérience'
  },
  qualifications: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Qualifications et diplômes'
  },
  bio: {
    type: DataTypes.TEXT,
    comment: 'Biographie du professeur'
  },
  contactInfo: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Informations de contact'
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(10, 2),
    comment: 'Tarif horaire'
  },
  availability: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Disponibilités du professeur'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NumeroH de l\'administrateur qui a créé le professeur'
  },
  ratings: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Évaluations des étudiants'
  }
}, {
  sequelize,
  modelName: 'Professor',
  tableName: 'diangou_professors',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['specialty']
    },
    {
      fields: ['isActive', 'isAvailable']
    }
  ]
});

export default Professor;

