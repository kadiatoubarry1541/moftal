import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * Demande de retrait d'un professionnel (clinique, école, etc.)
 * Le professionnel soumet une demande → l'admin valide → reçu généré.
 */
class ProWithdrawalRequest extends Model {}

ProWithdrawalRequest.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Compte professionnel concerné
  proAccountId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'pro_account_id'
  },
  proAccountName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'pro_account_name',
    comment: 'Nom du compte pro (clinique, école...)'
  },
  proAccountType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'pro_account_type',
    comment: 'Type : clinic, school, enterprise...'
  },
  proLogoUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'pro_logo_url',
    comment: 'Logo du compte pro pour le reçu'
  },
  // Propriétaire du compte
  ownerNumeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'owner_numero_h'
  },
  ownerNom: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'owner_nom'
  },
  // Montant demandé
  montant: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: 'Montant du retrait demandé en GNF'
  },
  // Motif de la demande
  motif: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Raison du retrait (ex: frais de fonctionnement)'
  },
  // Coordonnées de paiement
  coordonneesPaiement: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'coordonnees_paiement',
    comment: 'Orange Money, compte bancaire...'
  },
  // Statut de la demande
  statut: {
    type: DataTypes.ENUM('en_attente', 'valide', 'rejete'),
    defaultValue: 'en_attente'
  },
  // Validation admin
  validePar: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'valide_par',
    comment: 'NuméroH de l\'admin qui a validé'
  },
  valideParNom: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'valide_par_nom'
  },
  valideAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'valide_at'
  },
  // Rejet
  raisonRejet: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'raison_rejet'
  },
  // Référence du reçu généré
  receiptRef: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'receipt_ref'
  }
}, {
  sequelize,
  modelName: 'ProWithdrawalRequest',
  tableName: 'pro_withdrawal_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['pro_account_id'] },
    { fields: ['owner_numero_h'] },
    { fields: ['statut'] }
  ]
});

export default ProWithdrawalRequest;
