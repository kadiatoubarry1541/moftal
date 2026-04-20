import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class GalleryPoints extends Model {}

GalleryPoints.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  numeroH: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: 'numero_h'
  },
  pointsDisponibles: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'points_disponibles'
  },
  totalAchete: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_achete'
  }
}, {
  sequelize,
  modelName: 'GalleryPoints',
  tableName: 'gallery_points',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default GalleryPoints;
