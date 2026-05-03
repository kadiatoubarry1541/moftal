import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * Compte Famille Moftal
 * Répartition automatique des dépôts :
 *   50% → réserve bloquée
 *   30% → santé (paiement direct cliniques)
 *   10% → nourriture (paiement direct fournisseurs)
 *    5% → urgence (prison, danger, accident)
 *    5% → projet collectif familial
 */
class FamilyFund extends Model {

  /** Calcule la répartition d'un montant déposé — sans perte d'argent */
  static repartir(montant) {
    const m = Math.floor(Number(montant));
    const reserve    = Math.floor(m * 0.50);
    const sante      = Math.floor(m * 0.30);
    const nourriture = Math.floor(m * 0.10);
    const urgence    = Math.floor(m * 0.05);
    // Le reste va dans projet pour absorber les arrondis sans perdre un centime
    const projet     = m - reserve - sante - nourriture - urgence;
    return { reserve, sante, nourriture, urgence, projet };
  }

  /** Retourne le solde total disponible (hors réserve bloquée) */
  getSoldeDisponible() {
    return Number(this.solde_sante) + Number(this.solde_nourriture)
         + Number(this.solde_urgence) + Number(this.solde_projet);
  }

  /** Retourne le solde total du compte */
  getSoldeTotal() {
    return Number(this.solde_reserve) + this.getSoldeDisponible();
  }
}

FamilyFund.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nomFamille: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'nom_famille'
  },
  treeId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'tree_id'
  },
  // Soldes par catégorie (en GNF)
  solde_reserve: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '50% — bloqué, intouchable sauf vote unanime'
  },
  solde_sante: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '30% — paiement direct cliniques/hôpitaux sur Moftal'
  },
  solde_nourriture: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '10% — paiement direct fournisseurs alimentaires sur Moftal'
  },
  solde_urgence: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '5% — urgence : prison, danger, accident'
  },
  solde_projet: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '5% — projet collectif familial avec garantie'
  },
  // Totaux cumulés (pour statistiques)
  total_depose: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: 'Total de tous les dépôts depuis la création'
  },
  total_depense: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: 'Total de toutes les dépenses depuis la création'
  },
  // Gestionnaires du compte
  gerant1NumeroH: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'gerant1_numero_h'
  },
  gerant1Nom: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'gerant1_nom'
  },
  gerant1Photo: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'gerant1_photo'
  },
  gerant2NumeroH: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'gerant2_numero_h'
  },
  gerant2Nom: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'gerant2_nom'
  },
  gerant2Photo: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'gerant2_photo'
  },
  // Conseiller = le plus âgé de l'arbre, admin à vie
  conseillerNumeroH: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'conseiller_numero_h'
  },
  conseillerNom: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'conseiller_nom'
  },
  conseillerPhoto: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'conseiller_photo'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  sequelize,
  modelName: 'FamilyFund',
  tableName: 'family_funds',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['nom_famille'] },
    { fields: ['tree_id'] }
  ]
});

export default FamilyFund;
