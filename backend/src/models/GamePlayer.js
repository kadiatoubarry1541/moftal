import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

class GamePlayer extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      gameId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'games',
          key: 'id'
        }
      },
      numeroH: {
        type: DataTypes.STRING(20),
        allowNull: false,
        references: {
          model: 'users',
          key: 'numero_h'
        }
      },
      role: {
        type: DataTypes.ENUM('player1', 'player2', 'guest'),
        allowNull: false,
        defaultValue: 'guest'
      },
      balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Points du joueur (peut être négatif jusqu\'à 2 fois)'
      },
      debtCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Nombre de fois où le joueur a eu des points négatifs (max 2)'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      joinedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, {
      sequelize,
      modelName: 'GamePlayer',
      tableName: 'game_players',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['gameId', 'numeroH']
        },
        {
          fields: ['gameId']
        },
        {
          fields: ['numeroH']
        }
      ]
    });
  }

  static associate(models) {
    this.belongsTo(models.Game, {
      foreignKey: 'gameId',
      as: 'game'
    });
    this.belongsTo(models.User, {
      foreignKey: 'numeroH',
      targetKey: 'numeroH',
      as: 'player'
    });
    this.hasMany(models.GameAnswer, {
      foreignKey: 'playerId',
      as: 'answers'
    });
  }
}

export default GamePlayer;

