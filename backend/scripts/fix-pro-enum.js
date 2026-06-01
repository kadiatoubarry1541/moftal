/**
 * Ajoute la valeur 'ngo' au type ENUM professional_accounts dans PostgreSQL.
 * Le serveur utilise sequelize.sync() sans alter:true, donc les modifications
 * d'ENUM ne sont pas appliquées automatiquement — ce script le fait manuellement.
 *
 * Lancer une seule fois :
 *   cd backend && npm run fix-pro-enum
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sequelize } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    })
  : new Sequelize({
      dialect: 'postgres',
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || 5432,
      database: process.env.DB_NAME     || 'enfants_adam_eve',
      username: process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      logging:  false,
    });

async function fixProEnum() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion PostgreSQL OK');

    /* ── 1. Vérifier que la table professional_accounts existe ── */
    const [tableCheck] = await sequelize.query(`
      SELECT to_regclass('public.professional_accounts') AS tbl;
    `);
    if (!tableCheck[0].tbl) {
      console.log('ℹ️  La table professional_accounts n\'existe pas encore.');
      console.log('   Elle sera créée automatiquement au prochain démarrage du serveur.');
      await sequelize.close();
      process.exit(0);
    }

    /* ── 2. Trouver le nom exact du type ENUM dans PostgreSQL ── */
    // Sequelize nomme le type ENUM : "enum_{tableName}_{columnName}"
    const enumTypeName = 'enum_professional_accounts_type';

    const [typeCheck] = await sequelize.query(`
      SELECT typname FROM pg_type WHERE typname = '${enumTypeName}';
    `);

    if (typeCheck.length === 0) {
      console.log(`ℹ️  Le type ENUM "${enumTypeName}" n'existe pas encore.`);
      console.log('   Il sera créé automatiquement au prochain démarrage du serveur.');
      await sequelize.close();
      process.exit(0);
    }

    console.log(`🔍 Type ENUM trouvé : ${enumTypeName}`);

    /* ── 3. Lister les valeurs actuelles de l'ENUM ── */
    const [existingValues] = await sequelize.query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = '${enumTypeName}'::regtype
      ORDER BY enumsortorder;
    `);
    const current = existingValues.map(r => r.enumlabel);
    console.log('📋 Valeurs actuelles :', current.join(', '));

    /* ── 4. Valeurs attendues ── */
    const expected = [
      'clinic',
      'security_agency',
      'journalist',
      'enterprise',
      'school',
      'supplier',
      'scientist',
      'ngo',
      'mosque',
      'madrasa',
      'commerce',
      'vendor',
      'producer',
      'broker',
      'restaurant',
      'transport',
      'beauty',
      'artisan',
      'mairie',
    ];

    /* ── 5. Ajouter les valeurs manquantes ── */
    let changed = false;
    for (const val of expected) {
      if (!current.includes(val)) {
        await sequelize.query(
          `ALTER TYPE "${enumTypeName}" ADD VALUE IF NOT EXISTS '${val}';`
        );
        console.log(`  ➕ Valeur ajoutée à l'ENUM : '${val}'`);
        changed = true;
      }
    }

    if (!changed) {
      console.log('✅ L\'ENUM est déjà complet — aucune modification nécessaire.');
    } else {
      console.log('✅ ENUM professionnel mis à jour avec succès.');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur :', error.message);
    process.exit(1);
  }
}

fixProEnum();
