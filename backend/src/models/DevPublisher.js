import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

/** Personnes autorisées par l'admin à publier des actualités locales pour un
 *  lieu précis (chefs de quartier, correspondants...) — en plus des
 *  journalistes et administrateurs, déjà autorisés partout. */
const DevPublisher = sequelize.define('DevPublisher', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  numeroH: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING },
  role: { type: DataTypes.STRING(50) }, // ex: 'chef', 'correspondant' — libre, juste informatif
  scope: { type: DataTypes.STRING(30), allowNull: false },
  location: { type: DataTypes.STRING(100), allowNull: false },
  addedBy: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'dev_publishers',
  underscored: true,
  timestamps: true,
});

export default DevPublisher;
