import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../../config/database.js';

class CoursePermission extends Model {
  // Méthodes statiques
  static async getUserPermissions(numeroH) {
    return await this.findAll({
      where: { numeroH, isActive: true },
      order: [['created_at', 'DESC']]
    });
  }

  static async getCourseTypePermissions(courseType) {
    return await this.findAll({
      where: { courseType, isActive: true },
      order: [['created_at', 'DESC']]
    });
  }

  static async checkPermission(numeroH, courseType) {
    const permission = await this.findOne({
      where: { 
        numeroH, 
        courseType, 
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
CoursePermission.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  numeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'numero_h'
    }
  },
  courseType: {
    type: DataTypes.STRING, // 'audio', 'video', 'written', 'library', 'exercise'
    allowNull: false
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
  modelName: 'CoursePermission',
  tableName: 'diangou_course_permissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['numeroH']
    },
    {
      fields: ['courseType']
    },
    {
      fields: ['is_active']
    }
  ]
});

export default CoursePermission;

