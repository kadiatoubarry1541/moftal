import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

class Badge extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      icon: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: '🏆'
      },
      color: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: '#FFD700'
      },
      category: {
        type: DataTypes.STRING, // ENUM converti en STRING ('achievement', 'education', 'faith', 'family', 'health', 'social', 'special')
        allowNull: false,
        defaultValue: 'achievement'
      },
      rarity: {
        type: DataTypes.STRING, // ENUM converti en STRING ('common', 'rare', 'epic', 'legendary')
        allowNull: false,
        defaultValue: 'common'
      },
      requirements: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Critères pour obtenir ce badge'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdBy: {
        type: DataTypes.STRING(80),
        allowNull: false,
        comment: 'NumeroH de l\'admin qui a créé le badge'
      }
    }, {
      sequelize,
      modelName: 'Badge',
      tableName: 'badges',
      timestamps: true
    });
  }

  static associate(models) {
    this.belongsToMany(models.User, {
      through: 'UserBadges',
      foreignKey: 'badgeId',
      otherKey: 'numeroH'
    });
  }

  // Méthodes statiques
  static async getAllBadges() {
    return await this.findAll({
      where: { isActive: true },
      order: [['category', 'ASC'], ['rarity', 'ASC'], ['name', 'ASC']]
    });
  }

  static async getBadgesByCategory(category) {
    return await this.findAll({
      where: { 
        category: category,
        isActive: true 
      },
      order: [['rarity', 'ASC'], ['name', 'ASC']]
    });
  }

  static async createBadge(badgeData) {
    return await this.create(badgeData);
  }

  static async updateBadge(id, badgeData) {
    const badge = await this.findByPk(id);
    if (!badge) {
      throw new Error('Badge non trouvé');
    }
    return await badge.update(badgeData);
  }

  static async deleteBadge(id) {
    const badge = await this.findByPk(id);
    if (!badge) {
      throw new Error('Badge non trouvé');
    }
    return await badge.update({ isActive: false });
  }
}

export default Badge;