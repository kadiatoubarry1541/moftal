import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * Demande de paiement du Compte Solidarité Quartier / Sous-préfecture.
 * Un chef crée la demande (compté comme sa confirmation), un autre chef
 * doit confirmer pour que le paiement soit exécuté (2 confirmations
 * minimum). Aucun argent n'est jamais versé en cash à une personne :
 * uniquement paiement direct hôpital (santé) ou achat de riz (orphelins).
 */
class QuartierFundRequest extends Model {}

QuartierFundRequest.init({
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
  type: {
    type: DataTypes.ENUM('sante', 'orphelins'),
    allowNull: false
  },
  montant: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  nombreSacs: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'nombre_sacs',
    comment: "Nombre de sacs de riz (type='orphelins' uniquement) — montant recalculé côté serveur à partir de ça"
  },
  beneficiaireNom: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'beneficiaire_nom',
    comment: "Nom de l'hôpital, ou nom de l'orphelin/tuteur pour le riz"
  },
  beneficiaireContact: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'beneficiaire_contact'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  demandeurNumeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'demandeur_numero_h'
  },
  demandeurNom: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'demandeur_nom'
  },
  // Liste des chefs ayant confirmé : [{ numeroH, nom, date }]
  confirmations: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  rejetePar: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'rejete_par'
  },
  statut: {
    type: DataTypes.ENUM('en_attente', 'approuve', 'rejete'),
    defaultValue: 'en_attente'
  },
  executedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'executed_at'
  }
}, {
  sequelize,
  modelName: 'QuartierFundRequest',
  tableName: 'quartier_fund_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['fund_id'] },
    { fields: ['statut'] }
  ]
});

export default QuartierFundRequest;
