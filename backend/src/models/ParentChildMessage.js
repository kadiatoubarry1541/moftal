import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * Messagerie privée entre un parent et son enfant, propre à chaque lien
 * (ParentChildLink) — jamais mélangée avec le chat familial élargi ni avec
 * les autres enfants/parents du même utilisateur.
 */
class ParentChildMessage extends Model {
  static async getMessages(linkId, limit = 100, offset = 0) {
    return await this.findAll({
      where: { linkId },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  }
}

ParentChildMessage.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  linkId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'link_id'
  },
  numeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'numero_h'
  },
  messageType: {
    type: DataTypes.STRING,
    defaultValue: 'text',
    field: 'message_type'
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'information'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  mediaUrl: {
    type: DataTypes.TEXT,
    field: 'media_url'
  }
}, {
  sequelize,
  modelName: 'ParentChildMessage',
  tableName: 'parent_child_messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['link_id'] }
  ]
});

export default ParentChildMessage;
