import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * "Livre" du quartier / sous-préfecture — documents (PDF, etc.) sur
 * l'histoire et la vie du lieu, consultables par tous les membres.
 */
class QuartierDocument extends Model {}

QuartierDocument.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  scope: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  location: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  locationName: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'location_name'
  },
  titre: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fileUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'file_url'
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'file_name'
  },
  uploadedByNumeroH: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'uploaded_by_numero_h'
  },
  uploadedByNom: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'uploaded_by_nom'
  }
}, {
  sequelize,
  modelName: 'QuartierDocument',
  tableName: 'quartier_documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['scope', 'location'] }
  ]
});

export default QuartierDocument;
