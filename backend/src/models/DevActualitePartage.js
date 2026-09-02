import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

// Fait apparaître une actualité (déjà enregistrée une seule fois dans
// dev_actualites) à un niveau géographique supplémentaire — jamais une copie
// du contenu, juste un lien vers l'actualité d'origine.
const DevActualitePartage = sequelize.define('DevActualitePartage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  actualiteId: { type: DataTypes.UUID, allowNull: false },
  scope: { type: DataTypes.STRING(30), allowNull: false },
  location: { type: DataTypes.STRING(100), allowNull: false },
  partageBy: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'dev_actualite_partages',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['scope', 'location'] },
    { fields: ['actualite_id'] },
  ],
});

export default DevActualitePartage;
