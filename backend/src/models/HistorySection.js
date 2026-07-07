import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

// Sections historiques (Préhistoire, Antiquité, Moyen-Âge, Moderne, Contemporain)
export const HistorySection = sequelize.define('HistorySection', {
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
    type: DataTypes.TEXT,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  videos: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  documents: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'prehistoire | antiquite | moyen-age | moderne | contemporain'
  },
  period: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  importance: {
    type: DataTypes.STRING,
    defaultValue: 'medium',
    comment: 'low | medium | high'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'history_sections',
  timestamps: true
});

export default HistorySection;