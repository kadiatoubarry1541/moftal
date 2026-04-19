import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database_ia.js';

class IaKnowledge extends Model {}

IaKnowledge.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Identifiant lisible pour la connaissance (ex: salutations, alphabet)',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Titre pédagogique de la fiche de connaissance',
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Catégorie (ex: grammaire, conjugaison, vocabulaire, bases)',
    },
    level: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Niveau (ex: debutant, intermediaire, avance)',
    },
    triggers: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'Liste de mots ou expressions déclencheurs à rechercher dans la question',
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Réponse complète que le Professeur IA doit renvoyer',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
      comment: 'Permet de désactiver une fiche sans la supprimer',
    },
  },
  {
    sequelize,
    modelName: 'IaKnowledge',
    tableName: 'ia_knowledge',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      { fields: ['slug'], unique: true },
      { fields: ['category'] },
      { fields: ['level'] },
      { fields: ['is_active'] },
    ],
  }
);

export default IaKnowledge;

