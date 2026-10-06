import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class FriendRequest extends Model {
  static async getUserRequests(numeroH) {
    return await this.findAll({
      where: {
        toUser: numeroH,
        status: 'pending'
      },
      order: [['created_at', 'DESC']]
    });
  }
}

// Définition du modèle
FriendRequest.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  fromUser: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'from_user',
    comment: 'NumeroH de l\'expéditeur'
  },
  fromUserName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
    comment: 'Nom de l\'expéditeur'
  },
  toUser: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'to_user',
    comment: 'NumeroH du destinataire'
  },
  message: {
    type: DataTypes.TEXT,
    comment: 'Message accompagnant la demande'
  },
  status: {
    type: DataTypes.STRING, // ENUM converti en STRING ('pending', 'accepted', 'rejected'),
    defaultValue: 'pending'
  }
}, {
  sequelize,
  modelName: 'FriendRequest',
  tableName: 'friend_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['from_user']
    },
    {
      fields: ['to_user']
    },
    {
      fields: ['status']
    }
  ]
});

export default FriendRequest;










