/**
 * messageCleanup.js
 *
 * Supprime automatiquement tous les messages de communication
 * qui ont plus de 30 jours. Tourne une fois par jour.
 *
 * Tables nettoyées :
 *   - family_tree_messages  (messagerie familiale)
 *   - couple_activities     (messages couple / parent-enfant)
 *   - parent_child_activities
 *   - activity_messages     (groupes activité)
 *   - residence_messages    (quartiers)
 */

import { sequelize } from '../../config/database.js';

const TABLES = [
  { name: 'family_tree_messages',    col: 'created_at' },
  { name: 'couple_activities',       col: 'created_at' },
  { name: 'parent_child_activities', col: 'created_at' },
  { name: 'activity_messages',       col: 'created_at' },
  { name: 'residence_messages',      col: 'created_at' },
];

async function runMessageCleanup() {
  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  let totalDeleted = 0;

  for (const { name, col } of TABLES) {
    try {
      const [, meta] = await sequelize.query(
        `DELETE FROM "${name}" WHERE "${col}" < NOW() - INTERVAL '30 days'`,
        { type: 'RAW' }
      );
      const count = meta?.rowCount ?? 0;
      if (count > 0) {
        console.log(`🗑️  [Cleanup ${now}] ${name} : ${count} message(s) supprimé(s)`);
        totalDeleted += count;
      }
    } catch (err) {
      // Table inexistante ou autre erreur → on ignore silencieusement
      if (!err.message?.includes('does not exist')) {
        console.warn(`⚠️  [Cleanup] ${name} :`, err.message);
      }
    }
  }

  if (totalDeleted > 0) {
    console.log(`✅ [Cleanup] Total supprimé : ${totalDeleted} message(s) > 30 jours`);
  }
}

export function startMessageCleanup() {
  // Premier passage au démarrage
  runMessageCleanup();

  // Puis une fois par jour (24h)
  setInterval(runMessageCleanup, 24 * 60 * 60 * 1000);

  console.log('✅ [MessageCleanup] Démarré — nettoyage automatique 1x/jour (TTL 30 jours)');
}
