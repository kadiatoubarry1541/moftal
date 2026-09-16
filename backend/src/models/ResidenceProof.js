import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * Justificatif de résidence (papier de résidence) qu'un membre téléverse pour
 * prouver qu'il habite réellement le quartier déclaré. Visible par lui-même
 * et par l'admin du quartier (ResidenceGroup.admin) depuis la liste des membres.
 */
class ResidenceProof extends Model {}

ResidenceProof.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'group_id'
  },
  numeroH: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'numero_h'
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
  }
}, {
  sequelize,
  modelName: 'ResidenceProof',
  tableName: 'residence_proofs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['group_id'] },
    { fields: ['numero_h'] }
  ]
});

export default ResidenceProof;
