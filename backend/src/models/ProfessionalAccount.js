import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../../config/database_pro.js';

class ProfessionalAccount extends Model {
  static async getPendingAccounts() {
    return await this.findAll({
      where: { status: 'pending' },
      order: [['created_at', 'DESC']]
    });
  }

  static async getApprovedByType(type) {
    return await this.findAll({
      where: { type, status: 'approved', isActive: true, subscriptionStatus: 'active' },
      order: [['name', 'ASC']]
    });
  }

  static async getByOwner(ownerNumeroH) {
    return await this.findAll({
      where: { ownerNumeroH, isActive: true },
      order: [['created_at', 'DESC']]
    });
  }

  static async searchAccounts(query, type = null) {
    const where = {
      status: 'approved',
      isActive: true,
      subscriptionStatus: 'active',
      [Op.or]: [
        { name: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
        { city: { [Op.iLike]: `%${query}%` } }
      ]
    };
    if (type) where.type = type;
    return await this.findAll({ where, order: [['name', 'ASC']] });
  }
}

ProfessionalAccount.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM(
      'clinic',
      'security_agency',
      'journalist',
      'enterprise',
      'school',
      'supplier',
      'scientist',
      'ngo',
      // Types spécifiques au secteur Échanges
      'vendor',      // vendeurs / détaillants
      'producer',    // entreprises de production
      'broker',      // démarcheurs / agents pour location de maisons
      'restaurant',  // restauration : menu, commandes, appel direct
      'transport',   // taxi, moto, livraison à domicile
      'beauty',      // salon de beauté, coiffeur, spa
      'artisan'      // plombier, électricien, menuisier, soudeur
    ),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  address: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  city: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  country: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  phone: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  email: {
    type: DataTypes.STRING,
    defaultValue: '',
    validate: {
      isEmailOrEmpty(value) {
        if (value && value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new Error('Email invalide');
        }
      }
    }
  },
  services: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Liste des services proposés'
  },
  specialties: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Spécialités (pour cliniques, écoles, etc.)'
  },
  ownerNumeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'owner_numero_h',
    comment: 'NumeroH du propriétaire qui a inscrit ce compte'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  approvedAt: {
    type: DataTypes.DATE,
    field: 'approved_at',
    allowNull: true
  },
  approvedBy: {
    type: DataTypes.STRING,
    field: 'approved_by',
    allowNull: true,
    comment: 'NumeroH de l\'admin qui a approuvé'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    field: 'rejection_reason',
    allowNull: true
  },
  photo: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  justificatifDocument: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'justificatif_document',
    comment: 'Document prouvant l\'activité (diplôme, agrément, Kbis…) : URL ou base64'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Sous-secteur Échanges : primaire / secondaire / tertiaire
  // Obligatoire pour vendor, supplier, producer, broker
  // null pour tous les autres types
  subSector: {
    type: DataTypes.ENUM('primaire', 'secondaire', 'tertiaire'),
    allowNull: true,
    defaultValue: null,
    field: 'sub_sector'
  },
  // Statut d'abonnement / de paiement du compte pro
  subscriptionStatus: {
    // never_paid : approuvé mais jamais payé
    // active     : abonnement en règle, visible et utilisable
    // overdue    : en retard mais encore visible (optionnel pour plus tard)
    // blocked    : bloqué pour impayés
    type: DataTypes.ENUM('never_paid', 'active', 'overdue', 'blocked'),
    allowNull: false,
    defaultValue: 'never_paid',
    field: 'subscription_status'
  },
  subscriptionValidUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'subscription_valid_until'
  },
  // Coordonnées de paiement fournies par le professionnel (Orange Money / compte bancaire)
  billingInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Informations de paiement du professionnel (jamais exposées publiquement)'
  },
  // Visibilité accordée par le super admin (G7) au petit admin (G0)
  grantedToSubAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'granted_to_sub_admin',
    comment: 'Si true, le petit admin (G0) peut voir ce compte même hors du quota 50%'
  }
}, {
  sequelize,
  modelName: 'ProfessionalAccount',
  tableName: 'professional_accounts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['owner_numero_h'] },
    { fields: ['type', 'status'] },
    { fields: ['subscription_status'] }
  ]
});

export default ProfessionalAccount;
