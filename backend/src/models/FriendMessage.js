import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * Messagerie privée entre deux amis, propre à chaque amitié (Friend) —
 * jamais mélangée avec les autres amis de l'un ou l'autre.
 */
class FriendMessage extends Model {
  static async getMessages(linkId, limit = 100, offset = 0) {
    return await this.findAll({
      where: { linkId },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  }
}

FriendMessage.init({
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
  modelName: 'FriendMessage',
  tableName: 'friend_messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['link_id'] }
  ]
});

export default FriendMessage;
