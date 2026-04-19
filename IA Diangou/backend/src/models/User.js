import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class User extends Model {
  // Méthodes statiques
  static async findByNumeroH(numeroH) {
    const normalizedNumeroH = numeroH.trim().replace(/\s+/g, ' ');
    let user = await this.findOne({ where: { numeroH: normalizedNumeroH } });
    
    if (!user && normalizedNumeroH !== numeroH) {
      user = await this.findOne({ where: { numeroH } });
    }
    
    return user;
  }
}

// Définition du modèle User pour IA Diangou
User.init({
  numeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
    field: 'numero_h'
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  prenom: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nomFamille: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Données supplémentaires selon le type d\'utilisateur',
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'diangou_users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default User;

