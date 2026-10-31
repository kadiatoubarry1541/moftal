import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

class PageAdmin extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      pagePath: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Chemin de la page (ex: /sante, /securite, /echange)'
      },
      pageName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nom de la page'
      },
      adminNumeroH: {
        type: DataTypes.STRING(20),
        allowNull: false,
        references: {
          model: 'users',
          key: 'numero_h'
        },
        comment: 'NumeroH de l\'admin de la page'
      },
      assignedBy: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'NumeroH de l\'admin qui a assigné ce rôle'
      },
      assignedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }, {
      sequelize,
      modelName: 'PageAdmin',
      tableName: 'page_admins',
      timestamps: true,
      indexes: [
        {
          unique: true,
          // Utiliser les noms de colonnes en base (snake_case) pour éviter l'erreur "pagePath" n'existe pas
          fields: ['page_path', 'admin_numero_h']
        },
        {
          fields: ['page_path']
        },
        {
          fields: ['admin_numero_h']
        }
      ]
    });
  }

  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'adminNumeroH',
      targetKey: 'numeroH',
      as: 'admin'
    });
  }
}

// Initialisation unique : plusieurs fichiers de routes l'appellent ; une
// seconde initialisation effaçait le lien « admin » et faisait planter la liste.
let pageAdminPret = false;
export function preparerPageAdmin(sequelizeInstance, User) {
  if (!pageAdminPret) { PageAdmin.init(sequelizeInstance); pageAdminPret = true; }
  if (User && !PageAdmin.associations.admin) PageAdmin.associate({ User });
}

export default PageAdmin;

