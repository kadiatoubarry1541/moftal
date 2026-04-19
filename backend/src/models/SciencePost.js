import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database_ia.js';

class SciencePost extends Model {
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
SciencePost.init({
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
    type: DataTypes.STRING, // 'text', 'image', 'video', 'audio'
    allowNull: false,
    defaultValue: 'text'
  },
  mediaUrl: {
    type: DataTypes.STRING,
    field: 'media_url',
    comment: 'URL du fichier média (image, vidéo, audio)'
  },
  category: {
    type: DataTypes.STRING, // 'recentes', 'recherches', 'anciens'
    allowNull: false,
    defaultValue: 'recentes'
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NumeroH de l\'auteur'
  },
  authorName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'author_name',
    comment: 'Nom complet de l\'auteur'
  },
  likes: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Liste des NumeroH qui ont aimé'
  },
  comments: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Commentaires sur le post'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    field: 'is_active',
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'SciencePost',
  tableName: 'science_posts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['category']
    },
    {
      fields: ['author']
    },
    {
      fields: ['type']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['created_at']
    }
  ]
});

export default SciencePost;

