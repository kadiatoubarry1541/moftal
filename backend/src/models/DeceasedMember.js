import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

class DeceasedMember extends Model {
  // Méthodes statiques
  static async findByNumeroHD(numeroHD) {
    return await this.findOne({
      where: { numeroHD }
    });
  }

  static async findByParents(numeroHPere, numeroHMere) {
    return await this.findAll({
      where: {
        numeroHPere,
        numeroHMere
      },
      order: [['dateNaissance', 'ASC']]
    });
  }

  static async getFamilyMembers(numeroHPere, numeroHMere) {
    return await this.findAll({
      where: {
        [sequelize.Op.or]: [
          { numeroHPere },
          { numeroHMere },
          { numeroH: numeroHPere },
          { numeroH: numeroHMere }
        ]
      },
      order: [['dateNaissance', 'ASC']]
    });
  }
}

// Définition du modèle
DeceasedMember.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  numeroHD: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'NumeroH du défunt (commence par D)'
  },
  prenom: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nomFamille: {
    type: DataTypes.STRING,
    allowNull: false
  },
  genre: {
    type: DataTypes.STRING, // 'FEMME', 'HOMME', 'AUTRE'
    allowNull: false
  },
  dateNaissance: {
    type: DataTypes.DATEONLY
  },
  dateDeces: {
    type: DataTypes.DATEONLY
  },
  anneeDeces: {
    type: DataTypes.INTEGER
  },
  lieuNaissance: {
    type: DataTypes.STRING
  },
  lieuDeces: {
    type: DataTypes.STRING
  },
  causeDeces: {
    type: DataTypes.TEXT,
    field: 'cause_deces'
  },
  // Relations familiales
  numeroHPere: {
    type: DataTypes.STRING,
    comment: 'NumeroH du père (peut être vivant ou décédé)'
  },
  numeroHMere: {
    type: DataTypes.STRING,
    comment: 'NumeroH de la mère (peut être vivante ou décédée)'
  },
  prenomPere: {
    type: DataTypes.STRING
  },
  prenomMere: {
    type: DataTypes.STRING
  },
  pereStatut: {
    type: DataTypes.STRING, // 'Vivant' ou 'Mort'
    defaultValue: 'Mort'
  },
  mereStatut: {
    type: DataTypes.STRING, // 'Vivant' ou 'Mort'
    defaultValue: 'Mort'
  },
  // Informations supplémentaires
  ethnie: {
    type: DataTypes.STRING
  },
  regionOrigine: {
    type: DataTypes.STRING
  },
  pays: {
    type: DataTypes.STRING
  },
  religion: {
    type: DataTypes.STRING
  },
  statutSocial: {
    type: DataTypes.STRING
  },
  generation: {
    type: DataTypes.STRING
  },
  decet: {
    type: DataTypes.STRING
  },
  ageObtenu: {
    type: DataTypes.INTEGER
  },
  // Médias
  photo: {
    type: DataTypes.STRING
  },
  video: {
    type: DataTypes.STRING
  },
  preuve: {
    type: DataTypes.STRING
  },
  // Informations sur les enfants
  nbFilles: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbGarcons: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // Informations sur les frères et sœurs
  nbFreresMere: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbSoeursMere: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbFreresPere: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nbSoeursPere: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // Informations additionnelles
  additionalInfo: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Informations supplémentaires en JSON'
  },
  createdBy: {
    type: DataTypes.STRING,
    comment: 'NumeroH de la personne qui a enregistré ce défunt'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'DeceasedMember',
  tableName: 'deceased_members',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['numeroHD']
    },
    {
      fields: ['numeroHPere']
    },
    {
      fields: ['numeroHMere']
    },
    {
      fields: ['nomFamille']
    }
  ]
});

export default DeceasedMember;

