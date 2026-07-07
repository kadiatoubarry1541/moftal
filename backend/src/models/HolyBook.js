import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class HolyBook extends Model {
  static async getBooksByReligion(religion) {
    return await this.findAll({
      where: {
        religion,
        isActive: true
      },
      order: [['created_at', 'DESC']]
    });
  }
}

// Définition du modèle
HolyBook.init({
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
  religion: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Religion associée'
  },
  chapters: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Chapitres du livre'
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
  modelName: 'HolyBook',
  tableName: 'holy_books',
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

export default HolyBook;










