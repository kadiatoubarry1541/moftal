import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * Transaction du Compte Famille
 * Enregistre chaque dépôt et chaque paiement avec toute la traçabilité.
 */
class FamilyFundTransaction extends Model {}

FamilyFundTransaction.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  fundId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'fund_id'
  },
  // Qui a fait l'opération
  acteurNumeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'acteur_numero_h'
  },
  acteurNom: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'acteur_nom'
  },
  // Type d'opération
  type: {
    type: DataTypes.ENUM('depot', 'paiement_sante', 'paiement_nourriture', 'urgence', 'projet', 'reserve_deblocage', 'paiement_interne'),
    allowNull: false,
    comment: 'depot=entrée argent | paiement_*=sortie vers bénéficiaire | paiement_interne=famille→pro'
  },
  montant: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: 'Montant en GNF'
  },
  // Pour les paiements : qui reçoit l'argent
  beneficiaireNom: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'beneficiaire_nom',
    comment: 'Nom de la clinique, du fournisseur, ou de la personne'
  },
  beneficiaireContact: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'beneficiaire_contact',
    comment: 'Numéro Orange Money ou compte bancaire du bénéficiaire'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Raison du paiement (ex: hospitalisation de Mamadou Barry)'
  },
  // Répartition automatique lors d'un dépôt
  repartition: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Pour les dépôts : {reserve, sante, nourriture, urgence, projet}'
  },
  // Référence FedaPay
  fedapayRef: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'fedapay_ref'
  },
  statut: {
    type: DataTypes.ENUM('en_attente', 'confirme', 'echoue'),
    defaultValue: 'confirme'
  }
}, {
  sequelize,
  modelName: 'FamilyFundTransaction',
  tableName: 'family_fund_transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['fund_id'] },
    { fields: ['acteur_numero_h'] },
    { fields: ['type'] }
  ]
});

export default FamilyFundTransaction;
