import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * Entrée du "Livre" d'un Noyau Familial (testament/témoignage du fondateur).
 *
 * Règles :
 *  - Seul le fondateur du noyau (le numeroH sur lequel le noyau est centré) écrit dans son livre.
 *  - Chaque entrée (texte, audio ou vidéo) a sa propre visibilité, choisie par l'auteur :
 *      - 'visible' : consultable immédiatement par les membres du noyau
 *      - 'scelle'  : invisible aux autres tant que le fondateur est vivant,
 *                    révélée automatiquement à son décès
 *  - Les entrées ne sont jamais supprimées définitivement (isActive permet un retrait doux).
 */
class FamilyCoreEntry extends Model {
  static async getByFounder(founderNumeroH) {
    return await this.findAll({
      where: { founderNumeroH, isActive: true },
      order: [['created_at', 'DESC']]
    });
  }
}

FamilyCoreEntry.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  founderNumeroH: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NumeroH du fondateur du noyau (auteur de l\'entrée)',
    field: 'founder_numero_h'
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'texte',
    comment: 'texte | audio | video',
    field: 'type'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'title'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Texte libre, ou média audio/vidéo encodé en base64 (data URL)',
    field: 'content'
  },
  visibility: {
    type: DataTypes.STRING,
    defaultValue: 'visible',
    comment: 'visible | scelle (révélé au décès du fondateur)',
    field: 'visibility'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  sequelize,
  modelName: 'FamilyCoreEntry',
  tableName: 'family_core_entries',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['founder_numero_h'] }
  ]
});

export default FamilyCoreEntry;
