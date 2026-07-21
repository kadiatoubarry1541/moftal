import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  // Référence unique de la transaction (générée côté serveur)
  txRef: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false,
  },
  // Référence externe de la transaction (passerelle de paiement) — champ historique, plus utilisé
  flwRef: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  // Référence de la transaction chez le prestataire de paiement (FedaPay, Djomy...)
  // utilisée pour retrouver le paiement depuis le webhook.
  gatewayRef: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  // Qui paie
  payerNumeroH: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  // Montant en FG (Francs Guinéens)
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'GNF',
  },
  // Objet du paiement : 'subscription_pro', 'echange_product', 'donation', etc.
  purpose: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  // ID de l'objet concerné (ex: id du compte pro, id du produit)
  relatedId: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  // Statut : pending | completed | failed | cancelled
  // (le code applicatif utilise partout 'completed' pour un paiement réussi)
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'success', 'failed', 'cancelled'),
    defaultValue: 'pending',
  },
  // Méthode de paiement utilisée
  paymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  // Métadonnées supplémentaires (JSON)
  meta: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'payments',
  timestamps: true,
});

export default Payment;
