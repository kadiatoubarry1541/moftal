import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

function getNotifUrl(type) {
  switch (type) {
    case 'appointment_accepted':
    case 'appointment_rejected': return '/mes-rendez-vous';
    case 'new_appointment':
    case 'account_approved':
    case 'account_rejected': return '/mes-comptes-pro';
    case 'friend_request': return '/famille/mes-amours?tab=requests';
    case 'couple_request': return '/couple';
    case 'tree_request':
    case 'parent_request': return '/arbre';
    default: return '/';
  }
}

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
    const notif = await this.create({
      recipientNumeroH,
      type,
      title,
      message,
      relatedId
    });
    const payload = {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      relatedId: notif.relatedId,
      isRead: false,
      created_at: notif.created_at
    };

    // Push temps réel via Socket.IO
    try {
      const { getIO } = await import('../socket.js');
      const io = getIO();
      if (io) io.to(`user-${recipientNumeroH}`).emit('new-notification', payload);
    } catch { /* Socket non disponible */ }

    // Web Push — pour notifier même quand le navigateur est en arrière-plan
    try {
      const webpush = (await import('web-push')).default;
      const { default: PushSubscription } = await import('./PushSubscription.js');
      const subs = await PushSubscription.getForUser(recipientNumeroH);
      const pushPayload = JSON.stringify({
        title: notif.title,
        message: notif.message,
        type: notif.type,
        id: notif.id,
        url: getNotifUrl(notif.type)
      });
      await Promise.allSettled(subs.map(async sub => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            pushPayload
          );
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await PushSubscription.removeExpired(sub.endpoint);
          }
        }
      }));
    } catch { /* Web push non configuré */ }

    return notif;
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
