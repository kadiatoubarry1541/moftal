import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * Enfant ajouté par un parent alors qu'il n'a pas (encore) de compte Moftal :
 * bébé, enfant mineur, enfant décédé jeune… Il a un identifiant familial
 * « ENF-… » utilisé dans les liens parent-enfant (ParentChildLink.childNumeroH),
 * pour apparaître partout comme un enfant (arbre, Mes enfants, Noyau).
 *
 * Plus tard, l'enfant devenu grand crée son compte : sa fiche est fusionnée
 * avec son vrai NuméroH (automatiquement si les papiers correspondent, sinon
 * sur confirmation d'un parent). Les papiers ne sont jamais montrés qu'aux parents.
 */
class EnfantSansCompte extends Model {}

EnfantSansCompte.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  numero: { type: DataTypes.STRING(40), allowNull: false, unique: true, comment: 'Identifiant familial ENF-…' },
  prenom: { type: DataTypes.STRING, allowNull: false },
  nomFamille: { type: DataTypes.STRING, field: 'nom_famille' },
  genre: { type: DataTypes.STRING(10), allowNull: false, comment: 'HOMME | FEMME' },
  estVivant: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'est_vivant' },
  dateNaissance: { type: DataTypes.DATEONLY, field: 'date_naissance' },
  dateDeces: { type: DataTypes.DATEONLY, field: 'date_deces' },
  photo: { type: DataTypes.TEXT },
  quartierNaissance: { type: DataTypes.STRING, field: 'quartier_naissance' },
  // Extrait de naissance : le numéro n'est unique que dans une commune et une année
  extraitNumero: { type: DataTypes.STRING(60), field: 'extrait_numero' },
  extraitCommune: { type: DataTypes.STRING, field: 'extrait_commune' },
  extraitAnnee: { type: DataTypes.STRING(4), field: 'extrait_annee' },
  // Forme normalisée « numero|commune|annee » pour reconnaître le même enfant
  extraitCle: { type: DataTypes.STRING, field: 'extrait_cle' },
  // Autre parent hors Moftal (ou pas encore lié) : seulement son nom
  autreParentNom: { type: DataTypes.STRING, field: 'autre_parent_nom' },
  creePar: { type: DataTypes.STRING, allowNull: false, field: 'cree_par' },
  // Fusion avec le compte de l'enfant devenu grand
  fusionneAvec: { type: DataTypes.STRING, field: 'fusionne_avec' },
  fusionneLe: { type: DataTypes.DATE, field: 'fusionne_le' },
  liensFusionnes: { type: DataTypes.JSON, defaultValue: [], field: 'liens_fusionnes', comment: 'Liens déplacés vers le compte (pour annuler)' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' }
}, {
  sequelize,
  modelName: 'EnfantSansCompte',
  tableName: 'enfants_sans_compte',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ fields: ['extrait_cle'] }, { fields: ['cree_par'] }, { fields: ['fusionne_avec'] }]
});

export default EnfantSansCompte;
