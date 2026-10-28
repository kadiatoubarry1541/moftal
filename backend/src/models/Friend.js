import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../../config/database.js';

class Friend extends Model {
  static async getUserFriends(numeroH) {
    return await this.findAll({
      where: {
        [Op.or]: [
          { userNumeroH: numeroH },
          { friendNumeroH: numeroH }
        ],
        status: 'accepted'
      },
      order: [['acceptedAt', 'DESC']]
    });
  }
}

// Définition du modèle
Friend.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userNumeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'user_numero_h',
    comment: 'NumeroH de l\'utilisateur'
  },
  friendNumeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'friend_numero_h',
    comment: 'NumeroH de l\'ami'
  },
  status: {
    type: DataTypes.STRING, // ENUM converti en STRING ('pending', 'accepted', 'blocked'),
    defaultValue: 'pending'
  },
  requestedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  acceptedAt: {
    type: DataTypes.DATE
  },
  mutualFriends: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Nombre d\'amis en commun'
  },
  commonInterests: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Intérêts communs'
  },
  // 💎 Précieux : chacun l'active de son côté. L'amitié est précieuse quand
  // les deux l'ont activé ; sinon elle reste une simple connaissance.
  precieuxUser: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'precieux_user',
    comment: 'Précieux activé par user_numero_h'
  },
  // 'invitation' : vraie amitié (demande acceptée) ; 'messagerie' : simple
  // conversation ouverte depuis la messagerie (même activité) — pas un ami.
  origine: {
    type: DataTypes.STRING,
    defaultValue: 'invitation',
    field: 'origine'
  },
  precieuxFriend: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'precieux_friend',
    comment: 'Précieux activé par friend_numero_h'
  }
}, {
  sequelize,
  modelName: 'Friend',
  tableName: 'friends',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_numero_h']
    },
    {
      fields: ['friend_numero_h']
    },
    {
      fields: ['status']
    }
  ]
});

export default Friend;










