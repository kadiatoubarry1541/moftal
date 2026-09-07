import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * Liste des lieux "enfants" d'un lieu plus large — ex: les quartiers
 * d'une sous-préfecture, les sous-préfectures d'une préfecture, les
 * préfectures d'une région. Gérée par les admins/journalistes.
 */
class LocationChild extends Model {}

LocationChild.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  parentScope: {
    type: DataTypes.STRING(30),
    allowNull: false,
    field: 'parent_scope'
  },
  parentLocation: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'parent_location'
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  addedByNumeroH: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'added_by_numero_h'
  }
}, {
  sequelize,
  modelName: 'LocationChild',
  tableName: 'location_children',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['parent_scope', 'parent_location'] }
  ]
});

export default LocationChild;
