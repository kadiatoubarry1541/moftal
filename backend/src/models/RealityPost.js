import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database_temps.js';

class RealityPost extends Model {
  // Méthodes statiques
  static async getPostsByCategory(category) {
    return await this.findAll({
      where: {
        category,
        isActive: true
      },
      order: [['created_at', 'DESC']]
    });
  }

  static async getPostsByType(type) {
    return await this.findAll({
      where: {
        type,
        isActive: true
      },
      order: [['created_at', 'DESC']]
    });
  }

  static async getUserPosts(numeroH) {
    return await this.findAll({
      where: {
        author: numeroH,
        isActive: true
      },
      order: [['created_at', 'DESC']]
    });
  }

  static async getAllPosts() {
    return await this.findAll({
      where: {
        isActive: true
      },
      order: [['created_at', 'DESC']]
    });
  }
}

// Définition du modèle
RealityPost.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING, // 'video', 'image', 'text'
    allowNull: false,
    defaultValue: 'text'
  },
  category: {
    type: DataTypes.STRING, // 'video', 'photo', 'message'
    allowNull: false,
    defaultValue: 'message'
  },
  mediaUrl: {
    type: DataTypes.STRING,
    comment: 'URL du fichier média (image, vidéo)'
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NumeroH de l\'auteur'
  },
  authorName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nom complet de l\'auteur'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'RealityPost',
  tableName: 'reality_posts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['category']
    },
    {
      fields: ['type']
    },
    {
      fields: ['author']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['created_at']
    }
  ]
});

export default RealityPost;

