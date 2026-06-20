import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Logo from './Logo.js';

const UserLogo = sequelize.define('UserLogo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  numeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'numeroH'
    }
  },
  logoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'logos',
      key: 'id'
    }
  },
  assignedBy: {
    type: DataTypes.STRING,
    allowNull: false
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  assignedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'user_logos',
  timestamps: true
});

// Associations
UserLogo.belongsTo(Logo, { foreignKey: 'logoId', as: 'logo' });
Logo.hasMany(UserLogo, { foreignKey: 'logoId', as: 'userLogos' });

export default UserLogo;

