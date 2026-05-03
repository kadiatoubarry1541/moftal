import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class FamilyTreeMessage extends Model {
  // Méthodes statiques
  static async getFamilyMessages(familyName, limit = 50, offset = 0) {
    return await this.findAll({
      where: { familyName, isActive: true },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  }

  static async getUserFamilyMessages(numeroH) {
    return await this.findAll({
      where: { numeroH, isActive: true },
      order: [['created_at', 'DESC']]
    });
  }
}

// Définition du modèle
FamilyTreeMessage.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  familyName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nom de famille',
    field: 'family_name'
  },
  numeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'numero_h'
    },
    field: 'numero_h'
  },
  messageType: {
    type: DataTypes.STRING,
    defaultValue: 'text',
    field: 'message_type'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  mediaUrl: {
    type: DataTypes.TEXT,
    comment: 'Data URL base64 ou URL externe du fichier média',
    field: 'media_url'
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_edited'
  },
  editedAt: {
    type: DataTypes.DATE,
    field: 'edited_at'
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_deleted'
  },
  deletedAt: {
    type: DataTypes.DATE,
    field: 'deleted_at'
  },
  reactions: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Réactions des membres de la famille {numeroH: reactionType}'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  orangeMoneyAccount: {
    type: DataTypes.STRING,
    comment: 'Compte mobile pour les transferts familiaux',
    field: 'orange_money_account'
  }
}, {
  sequelize,
  modelName: 'FamilyTreeMessage',
  tableName: 'family_tree_messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['family_name']
    },
    {
      fields: ['numero_h']
    },
    {
      fields: ['created_at']
    }
  ]
});

export default FamilyTreeMessage;


