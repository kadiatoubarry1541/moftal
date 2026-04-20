import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class PointsTransaction extends Model {}

PointsTransaction.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  numeroH: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'numero_h'
  },
  pointsAjoutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'points_ajoutes'
  },
  montantGNF: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'montant_gnf'
  },
  note: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  adminNumeroH: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'admin_numero_h'
  }
}, {
  sequelize,
  modelName: 'PointsTransaction',
  tableName: 'points_transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['numero_h'] }
  ]
});

export default PointsTransaction;
