import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database_pro.js';

class ProPublication extends Model {}

ProPublication.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  professionalAccountId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'professional_account_id'
  },
  type: {
    type: DataTypes.STRING(50),
    defaultValue: 'annonce'
    // annonce, produit, service, promotion, evenement, info
  },
  titre: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  contenu: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  image: {
    type: DataTypes.TEXT, // base64 image
    allowNull: true
  },
  video: {
    type: DataTypes.TEXT, // base64 video max 30s
    allowNull: true
  },
  prix: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  disponible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  sequelize,
  modelName: 'ProPublication',
  tableName: 'pro_publications',
  timestamps: true,
  underscored: true
});

export default ProPublication;
