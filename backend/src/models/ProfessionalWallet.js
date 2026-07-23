import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * Moftal Pay — Wallet Professionnel
 * Chaque compte professionnel (clinique, école, ONG...) a son propre wallet.
 * - Reçoit les paiements internes depuis les comptes famille
 * - Peut demander un retrait vers Orange Money / banque (validé manuellement par un admin)
 * - Les transferts internes sont GRATUITS
 */
class ProfessionalWallet extends Model {}

ProfessionalWallet.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  proAccountId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'pro_account_id',
    comment: 'ID du ProfessionalAccount lié'
  },
  ownerNumeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'owner_numero_h'
  },
  nomPro: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'nom_pro',
    comment: 'Nom de la clinique / école / ONG...'
  },
  typePro: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'type_pro'
  },
  // Solde disponible (en GNF)
  solde: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: 'Solde disponible pour retrait (en GNF)'
  },
  // Statistiques cumulées
  totalRecu: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    field: 'total_recu',
    comment: 'Total reçu depuis la création (paiements internes)'
  },
  totalRetire: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    field: 'total_retire',
    comment: 'Total retiré vers Orange Money / banque'
  },
  // Coordonnées de retrait par défaut
  orangeMoneyNumero: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'orange_money_numero',
    comment: 'Numéro Orange Money pour les retraits'
  },
  compteBancaireIban: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'compte_bancaire_iban'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  sequelize,
  modelName: 'ProfessionalWallet',
  tableName: 'professional_wallets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['pro_account_id'], unique: true },
    { fields: ['owner_numero_h'] }
  ]
});

export default ProfessionalWallet;
