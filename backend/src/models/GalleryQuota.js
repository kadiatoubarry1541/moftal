import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class GalleryQuota extends Model {}

GalleryQuota.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  contextType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'context_type',
    validate: { isIn: [['family', 'couple', 'parent_child']] }
  },
  contextKey: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'context_key'
  },
  photosLibres: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    field: 'photos_libres'
  },
  videosLibres: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'videos_libres'
  },
  photosUtilisees: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'photos_utilisees'
  },
  videosUtilisees: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'videos_utilisees'
  }
}, {
  sequelize,
  modelName: 'GalleryQuota',
  tableName: 'gallery_quotas',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['context_type', 'context_key'] }
  ]
});

export default GalleryQuota;
