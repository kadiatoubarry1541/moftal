import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class PushSubscription extends Model {
  static async getForUser(numeroH) {
    return await this.findAll({ where: { numeroH, isActive: true } });
  }

  static async upsert(numeroH, { endpoint, p256dh, auth }) {
    const [sub] = await this.findOrCreate({
      where: { endpoint },
      defaults: { numeroH, endpoint, p256dh, auth }
    });
    if (sub.numeroH !== numeroH) {
      await sub.update({ numeroH, p256dh, auth, isActive: true });
    } else if (!sub.isActive) {
      await sub.update({ p256dh, auth, isActive: true });
    }
    return sub;
  }

  static async removeExpired(endpoint) {
    await this.update({ isActive: false }, { where: { endpoint } });
  }
}

PushSubscription.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  numeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'numero_h'
  },
  endpoint: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true
  },
  p256dh: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  auth: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  sequelize,
  modelName: 'PushSubscription',
  tableName: 'push_subscriptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['numero_h'] },
    { fields: ['endpoint'], unique: true }
  ]
});

export default PushSubscription;
