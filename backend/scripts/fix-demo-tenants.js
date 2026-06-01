/**
 * Insère les codes démo manquants dans management_tenants
 * et crée les tables des 4 derniers services si elles n'existent pas.
 *
 * Lancer :  cd backend && npm run fix-demo-tenants
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
      port:     +(process.env.DB_PORT   || 5432),
      database: process.env.DB_NAME     || 'enfants_adam_eve',
      username: process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      logging:  false,
    });

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion PostgreSQL OK');

    // ── 1. Créer les tables manquantes ──────────────────────────────────────
    console.log('\n📦 Création des tables manquantes...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "scientist_members" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "prenom"      VARCHAR(255),
        "telephone"   VARCHAR(50),
        "numero_h"    VARCHAR(100),
        "titre"       VARCHAR(100) DEFAULT 'Chercheur',
        "domaine"     VARCHAR(100),
        "institution" VARCHAR(255),
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "scientist_publications" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "auteur_id"   INTEGER,
        "auteur_nom"  VARCHAR(255),
        "titre"       VARCHAR(500) NOT NULL,
        "type_pub"    VARCHAR(50)  DEFAULT 'article',
        "domaine"     VARCHAR(100),
        "statut"      VARCHAR(50)  DEFAULT 'en_cours',
        "date_pub"    DATE,
        "resume"      TEXT,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "scientist_projects" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "titre"        VARCHAR(500) NOT NULL,
        "description"  TEXT,
        "responsable"  VARCHAR(255),
        "statut"       VARCHAR(50) DEFAULT 'en_cours',
        "date_debut"   DATE,
        "date_fin"     DATE,
        "budget"       NUMERIC(14,2),
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "scientist_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(500) NOT NULL,
        "contenu"     TEXT,
        "type"        VARCHAR(50) DEFAULT 'general',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "supplier_products" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "nom"          VARCHAR(255) NOT NULL,
        "categorie"    VARCHAR(100),
        "prix_gros"    NUMERIC(14,2) DEFAULT 0,
        "prix_detail"  NUMERIC(14,2) DEFAULT 0,
        "stock"        INTEGER DEFAULT 0,
        "unite"        VARCHAR(50)  DEFAULT 'unité',
        "is_active"    BOOLEAN DEFAULT true,
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "supplier_clients" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "nom"          VARCHAR(255) NOT NULL,
        "telephone"    VARCHAR(50),
        "adresse"      TEXT,
        "type_client"  VARCHAR(50) DEFAULT 'revendeur',
        "is_active"    BOOLEAN DEFAULT true,
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "supplier_orders" (
        "id"             SERIAL PRIMARY KEY,
        "tenant_code"    VARCHAR(50) NOT NULL,
        "client_id"      INTEGER,
        "client_nom"     VARCHAR(255),
        "montant_total"  NUMERIC(14,2) DEFAULT 0,
        "statut"         VARCHAR(50)  DEFAULT 'en_attente',
        "date_commande"  DATE DEFAULT CURRENT_DATE,
        "notes"          TEXT,
        "created_at"     TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "supplier_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(500) NOT NULL,
        "contenu"     TEXT,
        "type"        VARCHAR(50) DEFAULT 'general',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "security_agents" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "prenom"      VARCHAR(255),
        "telephone"   VARCHAR(50),
        "numero_h"    VARCHAR(100),
        "grade"       VARCHAR(100) DEFAULT 'Agent',
        "zone"        VARCHAR(100),
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "security_missions" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "agent_id"    INTEGER,
        "agent_nom"   VARCHAR(255),
        "titre"       VARCHAR(500) NOT NULL,
        "client_nom"  VARCHAR(255),
        "lieu"        VARCHAR(255),
        "date_debut"  DATE,
        "date_fin"    DATE,
        "statut"      VARCHAR(50)  DEFAULT 'en_cours',
        "notes"       TEXT,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "security_clients" (
        "id"            SERIAL PRIMARY KEY,
        "tenant_code"   VARCHAR(50) NOT NULL,
        "nom"           VARCHAR(255) NOT NULL,
        "telephone"     VARCHAR(50),
        "adresse"       TEXT,
        "type_contrat"  VARCHAR(50) DEFAULT 'ponctuel',
        "is_active"     BOOLEAN DEFAULT true,
        "created_at"    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "security_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(500) NOT NULL,
        "contenu"     TEXT,
        "type"        VARCHAR(50) DEFAULT 'general',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "enterprise_employees" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "nom"          VARCHAR(255) NOT NULL,
        "prenom"       VARCHAR(255),
        "telephone"    VARCHAR(50),
        "numero_h"     VARCHAR(100),
        "poste"        VARCHAR(100) DEFAULT 'Employé',
        "departement"  VARCHAR(100),
        "is_active"    BOOLEAN DEFAULT true,
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "enterprise_clients" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "telephone"   VARCHAR(50),
        "adresse"     TEXT,
        "secteur"     VARCHAR(100),
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "enterprise_contracts" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "client_id"   INTEGER,
        "client_nom"  VARCHAR(255),
        "titre"       VARCHAR(500) NOT NULL,
        "budget"      NUMERIC(14,2) DEFAULT 0,
        "statut"      VARCHAR(50)  DEFAULT 'en_cours',
        "date_debut"  DATE,
        "date_fin"    DATE,
        "description" TEXT,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "enterprise_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(500) NOT NULL,
        "contenu"     TEXT,
        "type"        VARCHAR(50) DEFAULT 'general',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('✅ Tables créées (ou déjà existantes)');

    // ── 2. Insérer les codes démo manquants ─────────────────────────────────
    console.log('\n🔑 Insertion des codes démo...');

    const demos = [
      ['DEMO-REF-CLIN', 'clinic',           'Clinique Référence Admin'],
      ['DEMO-REF-ECO',  'school',           'École Référence Admin'],
      ['DEMO-REF-MSQ',  'mosque',           'Mosquée Référence Admin'],
      ['DEMO-REF-MDS',  'madrasa',          'Madrasa Référence Admin'],
      ['DEMO-REF-COM',  'commerce',         'Boutique Référence Admin'],
      ['DEMO-REF-ENT',  'enterprise',       'Entreprise Référence Admin'],
      ['DEMO-REF-IMAM', 'imam',             'Réseau Imam Référence Admin'],
      ['DEMO-REF-NGO',  'ngo',              'ONG Référence Admin'],
      ['DEMO-REF-JOUR', 'journalist',       'Média Référence Admin'],
      ['DEMO-REF-SCIEN','scientist',        'Science Référence Admin'],
      ['DEMO-REF-FOUR', 'supplier',         'Fournisseur Référence Admin'],
      ['DEMO-REF-SECU', 'security_agency',  'Sécurité Référence Admin'],
    ];

    for (const [code, type, name] of demos) {
      const [existing] = await sequelize.query(
        `SELECT tenant_code FROM management_tenants WHERE tenant_code = :code LIMIT 1`,
        { replacements: { code }, type: Sequelize.QueryTypes.SELECT }
      );
      if (existing) {
        console.log(`  ⏭️  ${code} existe déjà`);
      } else {
        await sequelize.query(
          `INSERT INTO management_tenants (tenant_code, type, name, owner_numero_h, is_active)
           VALUES (:code, :type, :name, 'ADMIN-G7', true)`,
          { replacements: { code, type, name } }
        );
        console.log(`  ✅ ${code} (${type}) inséré`);
      }
    }

    console.log('\n🎉 Script terminé avec succès !');
    console.log('   Les 12 services sont maintenant accessibles depuis Gestion Interne.');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur :', err.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

run();
