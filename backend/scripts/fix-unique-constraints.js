/**
 * Ajoute les contraintes UNIQUE manquantes sur la table users.
 * Champs uniques : numero_h (déjà PK), numero_d, email, tel1 (téléphone principal).
 * Un numeroH, numeroD, email ou téléphone ne peut jamais appartenir à deux personnes.
 *
 * Usage : npm run fix-unique-constraints
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
      dialect:  'postgres',
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || 5432,
      database: process.env.DB_NAME     || 'enfants_adam_eve',
      username: process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      logging:  false,
    });

// Ajoute une contrainte UNIQUE seulement si elle n'existe pas déjà
async function addUniqueIfMissing(constraintName, table, column) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM pg_constraint WHERE conname = :name`,
    { replacements: { name: constraintName } }
  );
  if (rows.length) {
    console.log(`  ✅ Déjà présente : ${constraintName}`);
    return;
  }

  // Supprimer les doublons avant d'ajouter la contrainte (garde la rangée la plus ancienne)
  await sequelize.query(`
    DELETE FROM "${table}"
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY "${column}" ORDER BY created_at ASC NULLS LAST, id ASC) AS rn
        FROM "${table}"
        WHERE "${column}" IS NOT NULL AND "${column}" <> ''
      ) sub
      WHERE rn > 1
    )
  `).catch(() => {
    // Si pas de colonne id, on passe (numero_h est la PK)
  });

  await sequelize.query(
    `ALTER TABLE "${table}" ADD CONSTRAINT "${constraintName}" UNIQUE ("${column}")`
  );
  console.log(`  ➕ Contrainte ajoutée : ${constraintName} sur ${table}.${column}`);
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion PostgreSQL OK\n');

    console.log('🔒 Ajout des contraintes UNIQUE sur la table users...');

    // numero_h est déjà PRIMARY KEY → toujours unique, pas besoin de contrainte séparée
    console.log('  ✅ numero_h : déjà PRIMARY KEY (unique par défaut)');

    // numero_d — numéro Diangou, identifiant secondaire unique
    await addUniqueIfMissing('users_numero_d_unique', 'users', 'numero_d');

    // email — une adresse email ne peut appartenir qu'à une seule personne
    await addUniqueIfMissing('users_email_unique', 'users', 'email');

    // tel1 — numéro de téléphone principal unique
    await addUniqueIfMissing('users_tel1_unique', 'users', 'tel1');

    console.log('\n✅ Contraintes UNIQUE en place. Aucune donnée dupliquée ne pourra être enregistrée.');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Erreur :', err.message);
    await sequelize.close();
    process.exit(1);
  }
}

run();
