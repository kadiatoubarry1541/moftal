import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

class UserBadge extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      numeroH: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      badgeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'badges',
          key: 'id'
        }
      },
      awardedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      awardedBy: {
        type: DataTypes.STRING(80),
        allowNull: false,
        comment: 'NumeroH de l\'admin qui a attribué le badge'
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Raison de l\'attribution du badge'
      },
      isVisible: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }, {
      sequelize,
      modelName: 'UserBadge',
      tableName: 'user_badges',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['numeroH', 'badgeId']
        }
      ]
    });
  }

  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'numeroH',
      as: 'user'
    });
    this.belongsTo(models.Badge, {
      foreignKey: 'badgeId',
      as: 'badge'
    });
  }

  // Méthodes statiques
  static async getUserBadges(numeroH) {
    return await this.findAll({
      where: { 
        numeroH: numeroH,
        isVisible: true 
      },
      include: [{
        model: sequelize.models.Badge,
        as: 'badge',
        where: { isActive: true }
      }],
      order: [['awardedAt', 'DESC']]
    });
  }

  static async awardBadge(numeroH, badgeId, awardedBy, reason = null) {
    // Vérifier si l'utilisateur a déjà ce badge
    const existingBadge = await this.findOne({
      where: { numeroH, badgeId }
    });

    if (existingBadge) {
      throw new Error('L\'utilisateur possède déjà ce badge');
    }

    return await this.create({
      numeroH,
      badgeId,
      awardedBy,
      reason
    });
  }

  static async removeBadge(numeroH, badgeId) {
    const userBadge = await this.findOne({
      where: { numeroH, badgeId }
    });

    if (!userBadge) {
      throw new Error('Badge non trouvé pour cet utilisateur');
    }

    return await userBadge.destroy();
  }

  static async getBadgeStats() {
    const stats = await this.findAll({
      attributes: [
        'badgeId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      include: [{
        model: sequelize.models.Badge,
        as: 'badge',
        attributes: ['name', 'category', 'rarity']
      }],
      group: ['badgeId', 'badge.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    return stats;
  }
}

export default UserBadge;



