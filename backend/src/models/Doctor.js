import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class Doctor extends Model {
  // Méthodes d'instance
  getRating() {
    if (!this.ratings || this.ratings.length === 0) return 0;
    const sum = this.ratings.reduce((acc, rating) => acc + rating.value, 0);
    return sum / this.ratings.length;
  }

  // Méthodes statiques
  static async getDoctorsBySpecialty(specialty) {
    return await this.findAll({
      where: { 
        specialties: { [Op.contains]: [specialty] },
        isActive: true,
        isAvailable: true
      },
      order: [['name', 'ASC']]
    });
  }

  static async searchDoctors(query) {
    return await this.findAll({
      where: {
        isActive: true,
        isAvailable: true,
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { specialties: { [Op.contains]: [query] } },
          { city: { [Op.iLike]: `%${query}%` } }
        ]
      },
      order: [['name', 'ASC']]
    });
  }
}

// Définition du modèle
Doctor.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  specialties: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Spécialités médicales'
  },
  qualifications: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Qualifications et diplômes'
  },
  experience: {
    type: DataTypes.INTEGER,
    comment: 'Années d\'expérience'
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT
  },
  phone: {
    type: DataTypes.STRING,
    comment: 'Numéro de téléphone'
  },
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  consultationFee: {
    type: DataTypes.DECIMAL(10, 2),
    comment: 'Frais de consultation'
  },
  availability: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Disponibilités du médecin'
  },
  languages: {
    type: DataTypes.JSON,
    defaultValue: ['français'],
    comment: 'Langues parlées'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_available'
  },
  ratings: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Évaluations des patients'
  },
  reviews: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Avis des patients'
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NumeroH de l\'administrateur qui a créé le médecin'
  }
}, {
  sequelize,
  modelName: 'Doctor',
  tableName: 'doctors',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['city']
    },
    {
      fields: ['is_active', 'is_available']
    }
  ]
});

export default Doctor;


