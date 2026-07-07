import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class IaKnowledge extends Model {}

IaKnowledge.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    level: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    triggers: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    modelName: 'IaKnowledge',
    tableName: 'ia_knowledge',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      { fields: ['slug'], unique: true },
      { fields: ['category'] },
      { fields: ['level'] },
      { fields: ['is_active'] },
    ],
  }
);

export default IaKnowledge;

