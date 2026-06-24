import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const DevActualite = sequelize.define('DevActualite', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  numeroH: { type: DataTypes.STRING, allowNull: false },
  authorName: { type: DataTypes.STRING, allowNull: false },
  titre: { type: DataTypes.STRING(200), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  mediaUrl: { type: DataTypes.TEXT },
  mediaType: { type: DataTypes.STRING(10), defaultValue: 'text' },
  domaine: { type: DataTypes.STRING(50) },
  scope: { type: DataTypes.STRING(30), allowNull: false },
  location: { type: DataTypes.STRING(100), allowNull: false },
}, {
  tableName: 'dev_actualites',
  underscored: true,
  timestamps: true,
});

export default DevActualite;
