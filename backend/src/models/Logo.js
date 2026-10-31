import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Logo = sequelize.define('Logo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  icon: {
    type: DataTypes.STRING,
    defaultValue: '👤'
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: '#3B82F6'
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'personal'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'logos',
  timestamps: true,
  // Colonnes en snake_case (is_active, logo_id…), comme la table créée au démarrage
  underscored: true
});

export default Logo;

