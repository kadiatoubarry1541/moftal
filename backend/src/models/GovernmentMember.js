import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class GovernmentMember extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      governmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'governments',
          key: 'id'
        },
        comment: 'ID du gouvernement'
      },
      memberNumeroH: {
        type: DataTypes.STRING(20),
        allowNull: false,
        references: {
          model: 'users',
          key: 'numero_h'
        },
        comment: 'NumeroH du membre du gouvernement'
      },
      role: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Rôle/fonction (ex: "Premier Ministre", "Ministre de la Santé", "Ministre de l\'Éducation")'
      },
      ministry: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Ministère si applicable'
      },
      rank: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 99,
        comment: 'Ordre de préséance (1 = Premier Ministre, 2 = Vice-PM, 3+ = Ministres)'
      },
      appointedDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Date de nomination'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
        comment: 'Membre actif ou ancien membre'
      }
    }, {
      sequelize,
      modelName: 'GovernmentMember',
      tableName: 'government_members',
      timestamps: true,
      indexes: [
        {
          fields: ['governmentId']
        },
        {
          fields: ['memberNumeroH']
        },
        {
          fields: ['is_active']
        },
        {
          unique: true,
          fields: ['governmentId', 'memberNumeroH', 'is_active'],
          where: {
            is_active: true
          }
        }
      ]
    });
  }

  static associate(models) {
    this.belongsTo(models.Government, {
      foreignKey: 'governmentId',
      as: 'government'
    });
    this.belongsTo(models.User, {
      foreignKey: 'memberNumeroH',
      targetKey: 'numeroH',
      as: 'member'
    });
  }
}

export default GovernmentMember;

