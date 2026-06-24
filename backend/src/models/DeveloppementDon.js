import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const DeveloppementDon = sequelize.define('DeveloppementDon', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  numeroH: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  currency: { type: DataTypes.STRING(10), defaultValue: 'FG' },
  domaine: { type: DataTypes.STRING(50), defaultValue: 'general' },
  domaineLabel: { type: DataTypes.STRING(100) },
  message: { type: DataTypes.TEXT },
  scope: { type: DataTypes.STRING(30), allowNull: false },
  location: { type: DataTypes.STRING(100), allowNull: false },
}, {
  tableName: 'developpement_dons',
  underscored: true,
  timestamps: true,
});

export default DeveloppementDon;
