import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const DevSignalement = sequelize.define('DevSignalement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  numeroH: { type: DataTypes.STRING, allowNull: false },
  type: {
    type: DataTypes.ENUM('infrastructure', 'projet_abandonne', 'manque_service', 'autre'),
    defaultValue: 'autre'
  },
  description: { type: DataTypes.TEXT, allowNull: false },
  lieu: { type: DataTypes.STRING(200) },
  statut: {
    type: DataTypes.ENUM('recu', 'verifie', 'publie'),
    defaultValue: 'recu'
  },
  scope: { type: DataTypes.STRING(30), allowNull: false },
  location: { type: DataTypes.STRING(100), allowNull: false },
}, {
  tableName: 'dev_signalements',
  underscored: true,
  timestamps: true,
});

export default DevSignalement;
