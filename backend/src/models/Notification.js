import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class Notification extends Model {
  static async getForUser(recipientNumeroH) {
    return await this.findAll({
      where: { recipientNumeroH, isActive: true },
      order: [['created_at', 'DESC']],
      limit: 50
    });
  }

  static async getUnreadCount(recipientNumeroH) {
    return await this.count({
      where: { recipientNumeroH, isRead: false, isActive: true }
    });
  }

  static async markAllRead(recipientNumeroH) {
    return await this.update(
      { isRead: true, readAt: new Date() },
      { where: { recipientNumeroH, isRead: false, isActive: true } }
    );
  }

  static async createNotification({ recipientNumeroH, type, title, message, relatedId }) {
    return await this.create({
      recipientNumeroH,
      type,
      title,
      message,
      relatedId
    });
  }
}

Notification.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  recipientNumeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'recipient_numero_h'
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'general',
    comment: 'Types: appointment_accepted|appointment_rejected|account_approved|account_rejected|new_appointment|friend_request|couple_request|child_request|parent_request|tree_request|general'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  relatedId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'related_id',
    comment: 'ID de l\'objet lié (appointment, professional account, etc.)'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_read'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'read_at'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'Notification',
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['recipient_numero_h'] },
    { fields: ['is_read'] },
    { fields: ['recipient_numero_h', 'is_read'] }
  ]
});

export default Notification;
