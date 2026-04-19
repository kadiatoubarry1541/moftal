import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database_ia.js';

class IaConversation extends Model {}

IaConversation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'session_id',
      comment: 'Identifiant de session fourni par le serveur IA (UUID côté Python)',
    },
    userMessage: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'user_message',
      comment: "Question posée par l'élève au Professeur IA",
    },
    botResponse: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'bot_response',
      comment: 'Réponse renvoyée par le Professeur IA',
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'professeur_ia',
      comment: 'Source de la conversation (ex: professeur_ia, autre_ia...)',
    },
    numeroH: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'numero_h',
      comment: 'NumeroH de l\'utilisateur connecté (lié à User)',
    },
  },
  {
    sequelize,
    modelName: 'IaConversation',
    tableName: 'ia_conversations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['session_id'] },
      { fields: ['source'] },
      { fields: ['created_at'] },
      { fields: ['numero_h'] },
    ],
  }
);

export default IaConversation;

