import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class Supplier extends Model {
  // Méthodes statiques
  static async getActiveSuppliers() {
    return await this.findAll({
      where: { isActive: true, isApproved: true },
      order: [['created_at', 'DESC']]
    });
  }

  static async getPendingSuppliers() {
    return await this.findAll({
      where: { isActive: true, isApproved: false },
      order: [['created_at', 'DESC']]
    });
  }

  static async getUserSupplier(numeroH) {
    return await this.findOne({
      where: { numeroH }
    });
  }
}

// Définition du modèle
Supplier.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  numeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'numero_h'
    }
  },
  businessName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nom de l\'entreprise'
  },
  businessType: {
    type: DataTypes.STRING, // ENUM converti en STRING ('individuel', 'entreprise', 'coopérative', 'association'),
    allowNull: false,
    field: 'business_type'
  },
  description: {
    type: DataTypes.TEXT,
    comment: 'Description de l\'activité'
  },
  categories: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Catégories de produits/services'
  },
  contactInfo: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Informations de contact'
  },
  address: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Adresse complète'
  },
  documents: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Documents légaux (permis, licences, etc.)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_approved'
  },
  approvedBy: {
    type: DataTypes.STRING,
    comment: 'NumeroH de l\'administrateur qui a approuvé'
  },
  approvedAt: {
    type: DataTypes.DATE
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    comment: 'Raison du refus si applicable'
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
    comment: 'Note moyenne (0-5)'
  },
  totalSales: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Nombre total de ventes'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Supplier',
  tableName: 'suppliers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['numero_h']
    },
    {
      fields: ['is_active', 'is_approved']
    },
    {
      fields: ['business_type']
    }
  ]
});

export default Supplier;


