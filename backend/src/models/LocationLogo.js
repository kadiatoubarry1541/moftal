import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

// Logo d'un lieu sans admin local (sous-préfecture, préfecture, région...) —
// géré par les journalistes/admins, seuls déjà autorisés à publier à ces niveaux.
const LocationLogo = sequelize.define('LocationLogo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  scope: { type: DataTypes.STRING(30), allowNull: false },
  location: { type: DataTypes.STRING(100), allowNull: false },
  logoUrl: { type: DataTypes.STRING },
  updatedBy: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'location_logos',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['scope', 'location'] },
  ],
});

export default LocationLogo;
