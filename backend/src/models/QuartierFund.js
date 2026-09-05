import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * Compte Solidarité Quartier / Sous-préfecture
 * Chaque dépôt est réparti automatiquement (le donateur ne choisit plus) :
 *   50% → santé          → paiement direct à l'hôpital
 *   20% → orphelins      → achat direct de riz (- de 20 ans, sans père ni mère)
 *   30% → développement  → bloqué pour le moment, le quartier décidera plus
 *                          tard des projets à financer avec cette réserve
 * Géré par 2 ou 3 chefs de quartier/sous-préfecture ; un paiement n'est
 * exécuté qu'après confirmation d'au moins 2 chefs différents.
 */
class QuartierFund extends Model {

  /** Calcule la répartition d'un dépôt — sans perte d'argent (arrondis absorbés) */
  static repartir(montant) {
    const m = Math.floor(Number(montant));
    const sante = Math.floor(m * 0.50);
    const orphelins = Math.floor(m * 0.20);
    // Le reste va dans développement pour absorber les arrondis sans perdre un centime
    const developpement = m - sante - orphelins;
    return { sante, orphelins, developpement };
  }

  /** Liste des numéros H des chefs désignés (jusqu'à 3), sans valeurs vides */
  getChefs() {
    return [this.chef1NumeroH, this.chef2NumeroH, this.chef3NumeroH].filter(Boolean);
  }

  estChef(numeroH) {
    return this.getChefs().includes(numeroH);
  }

  /** Nombre de confirmations nécessaires avant exécution d'un paiement */
  getSeuilConfirmation() {
    return Math.min(2, this.getChefs().length || 1);
  }

  /** Solde utilisable (hors développement, bloqué pour le moment) */
  getSoldeDisponible() {
    return Number(this.solde_sante) + Number(this.solde_orphelins);
  }

  getSoldeTotal() {
    return this.getSoldeDisponible() + Number(this.solde_developpement);
  }
}

QuartierFund.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  scope: {
    type: DataTypes.STRING(30),
    allowNull: false,
    comment: "'quartier' ou 'sous-prefecture' uniquement"
  },
  location: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'location'
  },
  locationName: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'location_name'
  },
  // Soldes par catégorie (en GNF) — jamais de retrait cash
  solde_sante: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: 'Paiement direct aux hôpitaux'
  },
  solde_orphelins: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: 'Achat direct de riz pour les orphelins complets (- de 20 ans)'
  },
  solde_developpement: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: 'Bloqué pour le moment — projets de développement décidés plus tard par le quartier'
  },
  total_depose: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  total_depense: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  // Chefs gestionnaires (2 ou 3) — 2 confirmations minimum pour tout paiement
  chef1NumeroH: { type: DataTypes.STRING, allowNull: true, field: 'chef1_numero_h' },
  chef1Nom:     { type: DataTypes.STRING, allowNull: true, field: 'chef1_nom' },
  chef1Photo:   { type: DataTypes.TEXT,   allowNull: true, field: 'chef1_photo' },
  chef2NumeroH: { type: DataTypes.STRING, allowNull: true, field: 'chef2_numero_h' },
  chef2Nom:     { type: DataTypes.STRING, allowNull: true, field: 'chef2_nom' },
  chef2Photo:   { type: DataTypes.TEXT,   allowNull: true, field: 'chef2_photo' },
  chef3NumeroH: { type: DataTypes.STRING, allowNull: true, field: 'chef3_numero_h' },
  chef3Nom:     { type: DataTypes.STRING, allowNull: true, field: 'chef3_nom' },
  chef3Photo:   { type: DataTypes.TEXT,   allowNull: true, field: 'chef3_photo' },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  sequelize,
  modelName: 'QuartierFund',
  tableName: 'quartier_funds',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['scope', 'location'] }
  ]
});

export default QuartierFund;
