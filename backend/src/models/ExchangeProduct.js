import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class ExchangeProduct extends Model {
  // Méthodes d'instance
  getImageUrls() {
    return this.images ? this.images : [];
  }

  // Méthodes statiques
  static async getProductsByCategory(category) {
    return await this.findAll({
      where: { category, isActive: true },
      order: [['created_at', 'DESC']]
    });
  }

  static async getUserProducts(numeroH) {
    return await this.findAll({
      where: { numeroH, isActive: true },
      order: [['created_at', 'DESC']]
    });
  }

  static async searchProducts(query) {
    return await this.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
          { category: { [Op.iLike]: `%${query}%` } }
        ]
      },
      order: [['created_at', 'DESC']]
    });
  }
}

// Définition du modèle
ExchangeProduct.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING, // ENUM converti en STRING ('primaire', 'secondaire', 'tertiaire'),
    allowNull: false
  },
  subcategory: {
    type: DataTypes.STRING,
    comment: 'Sous-catégorie du produit'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'GNF',
    comment: 'Devise (GNF, USD, EUR)'
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'URLs des images du produit'
  },
  videos: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'URLs des vidéos du produit'
  },
  audio: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'URLs des enregistrements audio (ex. photo + audio 30s)'
  },
  numeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'numero_h'
    },
    comment: 'NumeroH du vendeur'
  },
  supplierId: {
    type: DataTypes.UUID,
    references: {
      model: 'suppliers',
      key: 'id'
    },
    comment: 'ID du fournisseur si applicable'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_available'
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  condition: {
    type: DataTypes.STRING, // ENUM converti en STRING ('neuf', 'occasion', 'reconditionné'),
    defaultValue: 'neuf'
  },
  location: {
    type: DataTypes.STRING,
    comment: 'Localisation du produit'
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Tags pour la recherche'
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  likes: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Liste des NumeroH qui ont aimé'
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NumeroH de l\'administrateur qui a créé le produit'
  },
  isMoftalExclusive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_moftal_exclusive',
    comment: 'Produit vendu UNIQUEMENT par Moftal (riz, huile…) — aucun autre vendeur autorisé'
  },
  moftalVendeur: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'moftal_vendeur',
    comment: 'NumeroH du gérant Moftal qui a publié ce produit exclusif'
  }
}, {
  sequelize,
  modelName: 'ExchangeProduct',
  tableName: 'exchange_products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['category']
    },
    {
      fields: ['numero_h']
    },
    {
      fields: ['is_active', 'is_available']
    },
    {
      fields: ['price']
    }
  ]
});

export default ExchangeProduct;


