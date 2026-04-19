import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * Liaison couple (Mon Homme / Ma Femme)
 *
 * Règles islamiques appliquées :
 *  - Un HOMME peut avoir jusqu'à 4 femmes actives (4 liens actifs)
 *  - Une FEMME ne peut avoir qu'un seul mari à la fois (1 lien actif)
 *  - Quand une femme rompt son lien → le lien est archivé (isArchived=true)
 *    → son contenu reste visible comme "souvenir passé" qu'elle peut supprimer
 */
class CoupleLink extends Model {

  /** Récupère TOUTES les épouses actives d'un homme (max 4) */
  static async getMyWives(husbandNumeroH) {
    return await this.findAll({
      where: {
        husbandNumeroH,
        status: 'active',
        isActive: true,
        isArchived: false
      },
      order: [['confirmed_at', 'ASC']]
    });
  }

  /** Récupère le mari actif d'une femme (unique — rétrocompat) */
  static async getMyHusband(wifeNumeroH) {
    return await this.findOne({
      where: {
        wifeNumeroH,
        status: 'active',
        isActive: true,
        isArchived: false
      }
    });
  }

  /** Compte le nombre d'épouses actives d'un homme */
  static async countWives(husbandNumeroH) {
    return await this.count({
      where: {
        husbandNumeroH,
        status: 'active',
        isActive: true,
        isArchived: false
      }
    });
  }

  /** Liens rompus (récupérables) pour un utilisateur */
  static async getBrokenLinks(numeroH) {
    return await this.findAll({
      where: {
        [Op.or]: [
          { husbandNumeroH: numeroH }, { wifeNumeroH: numeroH },
          { numeroH1: numeroH }, { numeroH2: numeroH }
        ],
        status: 'broken'
      },
      order: [['broken_at', 'DESC']]
    });
  }

  /** Liens archivés (passé) pour un utilisateur — visible seulement si pas supprimé de son côté */
  static async getArchivedLinks(numeroH) {
    return await this.findAll({
      where: {
        [Op.or]: [{ husbandNumeroH: numeroH }, { wifeNumeroH: numeroH }],
        isArchived: true,
        deletedByNumeroH1: { [Op.ne]: numeroH },
        deletedByNumeroH2: { [Op.ne]: numeroH }
      },
      order: [['archived_at', 'DESC']]
    });
  }

  /** Ancienne méthode conservée pour compatibilité — retourne le 1er lien actif */
  static async getMyPartner(numeroH) {
    return await this.findOne({
      where: {
        [Op.or]: [
          { numeroH1: numeroH },
          { numeroH2: numeroH },
          { husbandNumeroH: numeroH },
          { wifeNumeroH: numeroH }
        ],
        status: 'active',
        isActive: true,
        isArchived: false
      }
    });
  }

  static async findByNumeroMariage(numeroMariageMairie) {
    return await this.findOne({
      where: { numeroMariageMairie: numeroMariageMairie.trim(), isActive: true }
    });
  }

  /** Invitations en attente pour le destinataire */
  static async getPendingInvitations(numeroH) {
    return await this.findAll({
      where: {
        [Op.or]: [
          { numeroH1: numeroH },
          { numeroH2: numeroH },
          { husbandNumeroH: numeroH },
          { wifeNumeroH: numeroH }
        ],
        status: 'pending',
        isActive: true,
        isArchived: false,
        initiatedByNumeroH: { [Op.ne]: numeroH }
      },
      order: [['created_at', 'DESC']]
    });
  }
}

CoupleLink.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  numeroH1: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Conservé pour compatibilité (ancienne structure)',
    field: 'numero_h1'
  },
  numeroH2: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Conservé pour compatibilité (ancienne structure)',
    field: 'numero_h2'
  },
  husbandNumeroH: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'NumeroH du mari (HOMME)',
    field: 'husband_numero_h'
  },
  wifeNumeroH: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'NumeroH de la femme (FEMME)',
    field: 'wife_numero_h'
  },
  numeroMariageMairie: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Numéro reçu lors du mariage à la mairie (optionnel, unique si renseigné)',
    field: 'numero_mariage_mairie'
  },
  initiatedByNumeroH: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'initiated_by_numero_h'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    comment: 'pending | active | broken | archived',
    field: 'status'
    // broken  = rupture (récupérable — les deux voient "lien rompu", peuvent se remettre)
    // archived = séparation définitive côté d'un des deux
  },
  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'confirmed_at'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Séparation définitive demandée par au moins un des deux',
    field: 'is_archived'
  },
  archivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'archived_at'
  },
  archivedByNumeroH: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'NumeroH de celui qui a demandé la séparation définitive',
    field: 'archived_by_numero_h'
  },
  // Rupture temporaire (récupérable)
  brokenAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'broken_at'
  },
  brokenByNumeroH: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'NumeroH de celui qui a rompu en premier',
    field: 'broken_by_numero_h'
  },
  // Suppression côté personne (contenu supprimé uniquement dans son espace)
  deletedByNumeroH1: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Si renseigné : cet utilisateur a supprimé définitivement son côté',
    field: 'deleted_by_numero_h1'
  },
  deletedByNumeroH2: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Si renseigné : cet utilisateur a supprimé définitivement son côté',
    field: 'deleted_by_numero_h2'
  }
}, {
  sequelize,
  modelName: 'CoupleLink',
  tableName: 'couple_links',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['numero_h1'] },
    { fields: ['numero_h2'] },
    { fields: ['husband_numero_h'] },
    { fields: ['wife_numero_h'] },
    { unique: true, fields: ['numero_mariage_mairie'], where: { numero_mariage_mairie: { [Op.ne]: null } } }
    // NOTE: pas de contrainte unique sur (husband, wife) → un homme peut avoir plusieurs femmes
  ]
});

export default CoupleLink;