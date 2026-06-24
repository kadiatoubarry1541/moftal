import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const DevProjet = sequelize.define('DevProjet', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  authorNumeroH: { type: DataTypes.STRING, allowNull: false },
  authorName: { type: DataTypes.STRING, allowNull: false },
  titre: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  domaine: { type: DataTypes.STRING(50) },
  statut: {
    type: DataTypes.ENUM('annonce', 'en_cours', 'termine', 'abandonne'),
    defaultValue: 'annonce'
  },
  budget: { type: DataTypes.STRING(100) },
  source: { type: DataTypes.STRING(200) },
  dateDebut: { type: DataTypes.DATEONLY },
  dateFin: { type: DataTypes.DATEONLY },
  scope: { type: DataTypes.STRING(30), allowNull: false },
  location: { type: DataTypes.STRING(100), allowNull: false },
}, {
  tableName: 'dev_projets',
  underscored: true,
  timestamps: true,
});

export default DevProjet;
