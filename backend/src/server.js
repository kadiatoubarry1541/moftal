import http from 'http';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { initSocket } from './socket.js';

import connectDB, { sequelize } from '../config/database.js';
import { connectDB_Pro } from '../config/database_pro.js';
import { connectDB_IA } from '../config/database_ia.js';
import { connectDB_Temps } from '../config/database_temps.js';
import { connectDB_Diangou } from '../config/database_diangou.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import badgeRoutes from './routes/badges.js';
import logoRoutes from './routes/logos.js';
import pageAdminRoutes from './routes/pageAdmins.js';
import activityRoutes from './routes/activities.js';
import residenceRoutes from './routes/residences.js';
import educationRoutes from './routes/education.js';
import regionRoutes from './routes/regions.js';
import organizationRoutes from './routes/organizations.js';
import faithRoutes from './routes/faith.js';
import friendsRoutes from './routes/friends.js';
import additionalRoutes from './routes/additional.js';
import exchangeRoutes from './routes/exchange.js';
import documentRoutes from './routes/documents.js';
import defiEducatifRoutes from './routes/defiEducatif.js';
import familyRoutes from './routes/family.js';
import familyTreeRoutes from './routes/familyTree.js';
import parentChildRoutes from './routes/parentChild.js';
import coupleRoutes from './routes/couple.js';
import familyCoreRoutes from './routes/familyCore.js';
import scienceRoutes from './routes/science.js';
import realityRoutes from './routes/reality.js';
import stateMessagesRoutes from './routes/stateMessages.js';
import stateProductsRoutes from './routes/stateProducts.js';
import userStoriesRoutes from './routes/userStories.js';
import professionalRoutes from './routes/professionals.js';
import proMembersRoutes from './routes/pro-members.js';
import clinicMgmtRoutes from './routes/clinic-management.js';
import mairieMgmtRoutes  from './routes/mairie-management.js';
import mairePublicRoutes  from './routes/mairie-public.js';
import clinicPublicRoutes from './routes/clinic-public.js';
import commercePublicRoutes from './routes/commerce-public.js';
import proPublicRoutes from './routes/pro-public.js';
import schoolMgmtRoutes from './routes/school-management.js';
import mosqueMgmtRoutes from './routes/mosque-management.js';
import madrasaMgmtRoutes from './routes/madrasa-management.js';
import imamMgmtRoutes from './routes/imam-management.js';
import ngoMgmtRoutes        from './routes/ngo-management.js';
import journalistMgmtRoutes from './routes/journalist-management.js';
import commerceMgmtRoutes    from './routes/commerce-management.js';
import enterpriseMgmtRoutes  from './routes/enterprise-management.js';
import scientistMgmtRoutes   from './routes/scientist-management.js';
import supplierMgmtRoutes  from './routes/supplier-management.js';
import securityMgmtRoutes  from './routes/security-management.js';
import retailerMgmtRoutes  from './routes/retailer-management.js';
import beautyMgmtRoutes    from './routes/beauty-management.js';
import artisanMgmtRoutes   from './routes/artisan-management.js';
import producerMgmtRoutes  from './routes/producer-management.js';
import reseauMgmtRoutes      from './routes/reseau-management.js';
import immoMgmtRoutes        from './routes/immo-management.js';
import restaurantMgmtRoutes  from './routes/restaurant-management.js';
import transportMgmtRoutes  from './routes/transport-management.js';
import imamNetworkRoutes from './routes/imam-network.js';
import proNetworkRoutes from './routes/professional-network.js';
import appointmentRoutes from './routes/appointments.js';
import notificationRoutes from './routes/notifications.js';
import iaRoutes from './routes/ia.js';
import moderationRoutes from './routes/moderation.js';
import paymentRoutes from './routes/payment.js';
import uploadRoutes from './routes/upload.js';
import quotasRoutes from './routes/quotas.js';
import familyFundRoutes from './routes/familyFund.js';
import withdrawalRequestsRoutes from './routes/withdrawalRequests.js';
import djomyPaymentRoutes from './routes/djomyPayment.js';
import moftalPayRoutes from './routes/MoftalPay.js';
import pushRoutes from './routes/push.js';
import racinesRoutes from './routes/racines.js';
import zakatRoutes from './routes/zakat.js';
import formationsRoutes from './routes/formations.js';
import developpementRoutes from './routes/developpement.js';
import Payment from './models/Payment.js';
import { handleUploadError } from './middleware/upload.js';
import { config } from '../config.js';
import User from './models/User.js';
import bcrypt from 'bcryptjs';
import { startSubscriptionChecker } from './services/subscriptionChecker.js';
import { startMessageCleanup } from './services/messageCleanup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration dotenv
dotenv.config({ path: path.join(path.dirname(__dirname), 'config.env') });

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || config.PORT || 5002;

// Démarrage automatique du serveur IA (Python) quand le backend démarre
let iaProcess = null;

const startIaServer = () => {
  if (process.env.DISABLE_IA_AUTO_START === 'true') {
    console.log('ℹ️ Démarrage automatique de l\'IA désactivé (DISABLE_IA_AUTO_START=true)');
    return;
  }

  if (iaProcess) {
    // IA déjà démarrée
    return;
  }

  const iaDir = path.join(__dirname, '../../IA SC');
  // Cherche d'abord le Python du venv du projet, puis le Python système
  const venvPython = path.join(__dirname, '../../.venv/Scripts/python.exe');
  const pythonCmds = process.platform === 'win32'
    ? [venvPython, 'py', 'python']
    : [path.join(__dirname, '../../.venv/bin/python'), 'python3', 'python'];

  const trySpawn = (index) => {
    if (index >= pythonCmds.length) {
      console.error('❌ Impossible de démarrer automatiquement le Professeur IA (Python introuvable).');
      console.error('   Vérifiez que Python est installé, puis démarrez IA SC/app.py manuellement si nécessaire.');
      return;
    }

    const cmd = pythonCmds[index];
    console.log(`🔄 Tentative de démarrage du Professeur IA avec "${cmd}"...`);

    try {
      const safeCmd = (process.platform === 'win32' && cmd.includes(' ')) ? `"${cmd}"` : cmd;
      iaProcess = spawn(safeCmd, ['app.py'], {
        cwd: iaDir,
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
      });

      iaProcess.on('error', (err) => {
        console.error(`❌ Erreur lors du démarrage du Professeur IA avec "${cmd}":`, err.message);
        iaProcess = null;
        trySpawn(index + 1);
      });

      iaProcess.on('exit', (code) => {
        console.log(`ℹ️ Professeur IA arrêté (code: ${code}).`);
        iaProcess = null;
      });

      console.log('✅ Professeur IA lancé automatiquement (port 5000).');
    } catch (e) {
      console.error(`❌ Exception lors du démarrage de l\'IA avec "${cmd}":`, e.message);
      iaProcess = null;
      trySpawn(index + 1);
    }
  };

  trySpawn(0);
};

// Créer ou mettre à jour les comptes admin au démarrage
async function ensureAdmin() {
  const saltRounds = config.BCRYPT_ROUNDS || 12;

  const admins = [
    {
      numeroH: (process.env.ADMIN_NUMERO_H || 'G0C0P0R0E0F0 0').trim().replace(/\s+/g, ' '),
      password: process.env.ADMIN_PASSWORD || 'Neneyaya1',
      generation: 'G0', prenom: 'Administrateur', nom: 'Principal'
    },
    {
      numeroH: 'G7C7P7R7E7F7 7',
      password: process.env.SUPER_ADMIN_PASSWORD || 'Alphabobomodizakoolo2025@amourpur',
      generation: 'G7', prenom: 'Super', nom: 'Admin'
    },
  ];

  for (const { numeroH, password, generation, prenom, nom } of admins) {
    try {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      const [rows] = await User.sequelize.query(
        'SELECT numero_h, password FROM users WHERE LOWER(numero_h) = LOWER(:n) LIMIT 1',
        { replacements: { n: numeroH } }
      );
      if (rows && rows.length > 0) {
        const valid = await bcrypt.compare(password, rows[0].password);
        if (!valid) {
          await User.sequelize.query(
            'UPDATE users SET password=:p, role=\'super-admin\', is_active=true WHERE LOWER(numero_h)=LOWER(:n)',
            { replacements: { p: hashedPassword, n: numeroH } }
          );
          console.log(`✅ Compte ${numeroH} mis à jour`);
        } else {
          console.log(`✅ Compte ${numeroH} déjà OK`);
        }
      } else {
        await User.sequelize.query(
          `INSERT INTO users (numero_h, password, role, prenom, nom_famille, genre, generation, type, is_active, is_verified, created_at, updated_at)
           VALUES (:n, :p, 'super-admin', :prenom, :nom, 'AUTRE', :gen, 'vivant', true, true, NOW(), NOW())
           ON CONFLICT (numero_h) DO UPDATE SET password=:p, role='super-admin', is_active=true`,
          { replacements: { n: numeroH, p: hashedPassword, prenom, nom, gen: generation } }
        );
        console.log(`✅ Compte ${numeroH} créé`);
      }
    } catch (e) {
      console.warn(`⚠️ ensureAdmin [${numeroH}]:`, e.message);
    }
  }
}

// Crée toutes les tables supplémentaires (galerie, activités couple/parent-enfant)
// en production où sequelize.sync({ alter }) n'est pas exécuté
async function initAllTables() {
  const tables = [
    {
      name: 'family_gallery',
      sql: `
        CREATE TABLE IF NOT EXISTS "family_gallery" (
          "id"                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
          "family_name"         VARCHAR(255) NOT NULL,
          "uploader_numero_h"   VARCHAR(255) NOT NULL,
          "uploader_name"       VARCHAR(255) NOT NULL DEFAULT 'Membre',
          "album"               VARCHAR(50)  NOT NULL,
          "url"                 TEXT         NOT NULL,
          "type"                VARCHAR(20)  DEFAULT 'image',
          "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );`,
      indexes: [
        `CREATE INDEX IF NOT EXISTS idx_fg_family_name ON "family_gallery" ("family_name");`,
        `CREATE INDEX IF NOT EXISTS idx_fg_uploader    ON "family_gallery" ("uploader_numero_h");`,
        `CREATE INDEX IF NOT EXISTS idx_fg_album       ON "family_gallery" ("album");`
      ],
      alters: [`ALTER TABLE "family_gallery" ALTER COLUMN "url" TYPE TEXT;`]
    },
    {
      name: 'couple_activities',
      sql: `
        CREATE TABLE IF NOT EXISTS "couple_activities" (
          "id"             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
          "numero_h1"      VARCHAR(255) NOT NULL,
          "numero_h2"      VARCHAR(255) NOT NULL,
          "from_numero_h"  VARCHAR(255) NOT NULL,
          "to_numero_h"    VARCHAR(255) NOT NULL,
          "type"           VARCHAR(50)  DEFAULT 'message',
          "content"        TEXT,
          "media_url"      TEXT,
          "is_active"      BOOLEAN      DEFAULT true,
          "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );`,
      indexes: [
        `CREATE INDEX IF NOT EXISTS idx_ca_pair ON "couple_activities" ("numero_h1", "numero_h2");`,
        `CREATE INDEX IF NOT EXISTS idx_ca_from ON "couple_activities" ("from_numero_h");`
      ],
      alters: [`ALTER TABLE "couple_activities" ALTER COLUMN "media_url" TYPE TEXT;`]
    },
    {
      name: 'science_posts',
      sql: `
        CREATE TABLE IF NOT EXISTS "science_posts" (
          "id"          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
          "title"       VARCHAR(255) NOT NULL DEFAULT 'Sans titre',
          "content"     TEXT         NOT NULL DEFAULT '',
          "type"        VARCHAR(50)  NOT NULL DEFAULT 'text',
          "media_url"   TEXT,
          "category"    VARCHAR(50)  NOT NULL DEFAULT 'recentes',
          "author"      VARCHAR(255) NOT NULL,
          "author_name" VARCHAR(255) NOT NULL DEFAULT '',
          "likes"       JSONB        DEFAULT '[]',
          "comments"    JSONB        DEFAULT '[]',
          "is_active"   BOOLEAN      DEFAULT true,
          "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );`,
      indexes: [
        `CREATE INDEX IF NOT EXISTS idx_sp_category   ON "science_posts" ("category");`,
        `CREATE INDEX IF NOT EXISTS idx_sp_author     ON "science_posts" ("author");`,
        `CREATE INDEX IF NOT EXISTS idx_sp_created_at ON "science_posts" ("created_at");`
      ],
      alters: []
    },
    {
      name: 'science_permissions',
      sql: `
        CREATE TABLE IF NOT EXISTS "science_permissions" (
          "id"          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
          "numero_h"    VARCHAR(255) NOT NULL UNIQUE,
          "is_active"   BOOLEAN      DEFAULT true,
          "granted_by"  VARCHAR(255) NOT NULL DEFAULT '',
          "granted_at"  TIMESTAMPTZ  DEFAULT NOW(),
          "expires_at"  TIMESTAMPTZ,
          "notes"       TEXT,
          "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );`,
      indexes: [
        `CREATE INDEX IF NOT EXISTS idx_scperm_numero_h ON "science_permissions" ("numero_h");`
      ],
      alters: []
    },
    {
      name: 'reality_posts',
      sql: `
        CREATE TABLE IF NOT EXISTS "reality_posts" (
          "id"          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
          "title"       VARCHAR(255) NOT NULL DEFAULT 'Sans titre',
          "content"     TEXT         NOT NULL DEFAULT '',
          "type"        VARCHAR(50)  NOT NULL DEFAULT 'text',
          "category"    VARCHAR(50)  NOT NULL DEFAULT 'message',
          "media_url"   TEXT,
          "author"      VARCHAR(255) NOT NULL,
          "author_name" VARCHAR(255) NOT NULL DEFAULT '',
          "is_active"   BOOLEAN      DEFAULT true,
          "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );`,
      indexes: [
        `CREATE INDEX IF NOT EXISTS idx_rp_category   ON "reality_posts" ("category");`,
        `CREATE INDEX IF NOT EXISTS idx_rp_author     ON "reality_posts" ("author");`,
        `CREATE INDEX IF NOT EXISTS idx_rp_created_at ON "reality_posts" ("created_at");`
      ],
      alters: []
    },
    {
      name: 'parent_child_activities',
      sql: `
        CREATE TABLE IF NOT EXISTS "parent_child_activities" (
          "id"               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
          "parent_numero_h"  VARCHAR(255) NOT NULL,
          "child_numero_h"   VARCHAR(255) NOT NULL,
          "from_numero_h"    VARCHAR(255) NOT NULL,
          "to_numero_h"      VARCHAR(255) NOT NULL,
          "type"             VARCHAR(50)  DEFAULT 'message',
          "content"          TEXT,
          "media_url"        TEXT,
          "is_active"        BOOLEAN      DEFAULT true,
          "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );`,
      indexes: [
        `CREATE INDEX IF NOT EXISTS idx_pca_pair ON "parent_child_activities" ("parent_numero_h", "child_numero_h");`,
        `CREATE INDEX IF NOT EXISTS idx_pca_from ON "parent_child_activities" ("from_numero_h");`
      ],
      alters: [`ALTER TABLE "parent_child_activities" ALTER COLUMN "media_url" TYPE TEXT;`]
    },
    {
      name: 'family_funds',
      sql: `
        CREATE TABLE IF NOT EXISTS "family_funds" (
          "id"               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
          "nom_famille"      VARCHAR(255) NOT NULL,
          "tree_id"          UUID,
          "solde_reserve"    BIGINT       NOT NULL DEFAULT 0,
          "solde_sante"      BIGINT       NOT NULL DEFAULT 0,
          "solde_nourriture" BIGINT       NOT NULL DEFAULT 0,
          "solde_urgence"    BIGINT       NOT NULL DEFAULT 0,
          "solde_projet"     BIGINT       NOT NULL DEFAULT 0,
          "total_depose"     BIGINT       NOT NULL DEFAULT 0,
          "total_depense"    BIGINT       NOT NULL DEFAULT 0,
          "gerant1_numero_h"    VARCHAR(255),
          "gerant1_nom"         VARCHAR(255),
          "gerant1_photo"       TEXT,
          "gerant2_numero_h"    VARCHAR(255),
          "gerant2_nom"         VARCHAR(255),
          "gerant2_photo"       TEXT,
          "conseiller_numero_h" VARCHAR(255),
          "conseiller_nom"      VARCHAR(255),
          "conseiller_photo"    TEXT,
          "is_active"           BOOLEAN      NOT NULL DEFAULT true,
          "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );`,
      indexes: [
        `CREATE INDEX IF NOT EXISTS idx_ff_nom_famille ON "family_funds" ("nom_famille");`,
        `CREATE INDEX IF NOT EXISTS idx_ff_tree_id     ON "family_funds" ("tree_id");`
      ],
      alters: [
        `ALTER TABLE "family_funds" ADD COLUMN IF NOT EXISTS "conseiller_numero_h" VARCHAR(255);`,
        `ALTER TABLE "family_funds" ADD COLUMN IF NOT EXISTS "conseiller_nom"      VARCHAR(255);`,
        `ALTER TABLE "family_funds" ADD COLUMN IF NOT EXISTS "gerant1_nom"         VARCHAR(255);`,
        `ALTER TABLE "family_funds" ADD COLUMN IF NOT EXISTS "gerant1_photo"       TEXT;`,
        `ALTER TABLE "family_funds" ADD COLUMN IF NOT EXISTS "gerant2_nom"         VARCHAR(255);`,
        `ALTER TABLE "family_funds" ADD COLUMN IF NOT EXISTS "gerant2_photo"       TEXT;`,
        `ALTER TABLE "family_funds" ADD COLUMN IF NOT EXISTS "conseiller_photo"    TEXT;`
      ]
    },
    {
      name: 'deceased_members_migrations',
      sql: `SELECT 1;`,
      alters: [
        `ALTER TABLE "deceased_members" ADD COLUMN IF NOT EXISTS "cause_deces" TEXT;`
      ]
    },
    {
      name: 'family_fund_transactions',
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_family_fund_transactions_type') THEN
            CREATE TYPE "enum_family_fund_transactions_type" AS ENUM ('depot','paiement_sante','paiement_nourriture','urgence','projet','reserve_deblocage');
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_family_fund_transactions_statut') THEN
            CREATE TYPE "enum_family_fund_transactions_statut" AS ENUM ('en_attente','confirme','echoue');
          END IF;
        END $$;
        CREATE TABLE IF NOT EXISTS "family_fund_transactions" (
          "id"                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
          "fund_id"              UUID        NOT NULL,
          "acteur_numero_h"      VARCHAR(255) NOT NULL,
          "acteur_nom"           VARCHAR(255),
          "type"                 "enum_family_fund_transactions_type" NOT NULL,
          "montant"              BIGINT       NOT NULL,
          "beneficiaire_nom"     VARCHAR(255),
          "beneficiaire_contact" VARCHAR(255),
          "description"          TEXT,
          "repartition"          JSONB,
          "fedapay_ref"          VARCHAR(255),
          "statut"               "enum_family_fund_transactions_statut" NOT NULL DEFAULT 'confirme',
          "created_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          "updated_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );`,
      indexes: [
        `CREATE INDEX IF NOT EXISTS idx_fft_fund_id   ON "family_fund_transactions" ("fund_id");`,
        `CREATE INDEX IF NOT EXISTS idx_fft_acteur    ON "family_fund_transactions" ("acteur_numero_h");`,
        `CREATE INDEX IF NOT EXISTS idx_fft_type      ON "family_fund_transactions" ("type");`
      ],
      alters: []
    },
    {
      name: 'pro_withdrawal_requests',
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_pro_withdrawal_requests_statut') THEN
            CREATE TYPE "enum_pro_withdrawal_requests_statut" AS ENUM ('en_attente','valide','rejete');
          END IF;
        END $$;
        CREATE TABLE IF NOT EXISTS "pro_withdrawal_requests" (
          "id"                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
          "pro_account_id"       UUID         NOT NULL,
          "pro_account_name"     VARCHAR(255),
          "pro_account_type"     VARCHAR(100),
          "pro_logo_url"         TEXT,
          "owner_numero_h"       VARCHAR(255) NOT NULL,
          "owner_nom"            VARCHAR(255),
          "montant"              BIGINT       NOT NULL,
          "motif"                TEXT,
          "coordonnees_paiement" VARCHAR(255),
          "statut"               "enum_pro_withdrawal_requests_statut" NOT NULL DEFAULT 'en_attente',
          "valide_par"           VARCHAR(255),
          "valide_par_nom"       VARCHAR(255),
          "valide_at"            TIMESTAMPTZ,
          "raison_rejet"         TEXT,
          "receipt_ref"          VARCHAR(50),
          "created_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          "updated_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );`,
      indexes: [
        `CREATE INDEX IF NOT EXISTS idx_pwr_pro_id    ON "pro_withdrawal_requests" ("pro_account_id");`,
        `CREATE INDEX IF NOT EXISTS idx_pwr_owner     ON "pro_withdrawal_requests" ("owner_numero_h");`,
        `CREATE INDEX IF NOT EXISTS idx_pwr_statut    ON "pro_withdrawal_requests" ("statut");`
      ],
      alters: []
    },
    {
      name: 'professional_wallets',
      sql: `
        CREATE TABLE IF NOT EXISTS "professional_wallets" (
          "id"                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
          "pro_account_id"       UUID        NOT NULL,
          "owner_numero_h"       VARCHAR(255) NOT NULL,
          "nom_pro"              VARCHAR(255),
          "type_pro"             VARCHAR(100),
          "solde"                BIGINT       NOT NULL DEFAULT 0,
          "total_recu"           BIGINT       NOT NULL DEFAULT 0,
          "total_retire"         BIGINT       NOT NULL DEFAULT 0,
          "orange_money_numero"  VARCHAR(50),
          "compte_bancaire_iban" VARCHAR(100),
          "is_active"            BOOLEAN      NOT NULL DEFAULT true,
          "created_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          "updated_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_pw_pro_account UNIQUE ("pro_account_id")
        );`,
      indexes: [
        `CREATE INDEX IF NOT EXISTS idx_pw_owner ON "professional_wallets" ("owner_numero_h");`
      ],
      alters: []
    },
    {
      name: 'platform_commissions',
      sql: `
        CREATE TABLE IF NOT EXISTS "platform_commissions" (
          "id"              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
          "source_type"     VARCHAR(50)  NOT NULL,
          "source_ref"      VARCHAR(255) NOT NULL,
          "montant_brut"    BIGINT       NOT NULL,
          "taux"            DECIMAL(5,2) NOT NULL DEFAULT 1.00,
          "commission"      BIGINT       NOT NULL,
          "payeur_numero_h" VARCHAR(255),
          "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );`,
      indexes: [
        `CREATE INDEX IF NOT EXISTS idx_pc_source_ref  ON "platform_commissions" ("source_ref");`,
        `CREATE INDEX IF NOT EXISTS idx_pc_source_type ON "platform_commissions" ("source_type");`,
        `CREATE INDEX IF NOT EXISTS idx_pc_created_at  ON "platform_commissions" ("created_at");`
      ],
      alters: [
        `ALTER TABLE "exchange_products" ADD COLUMN IF NOT EXISTS "is_moftal_exclusive" BOOLEAN NOT NULL DEFAULT false;`,
        `ALTER TABLE "exchange_products" ADD COLUMN IF NOT EXISTS "moftal_vendeur" VARCHAR(255);`
      ]
    },
    {
      name: 'activity_groups',
      sql: `
        CREATE TABLE IF NOT EXISTS "activity_groups" (
          "id"          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
          "name"        VARCHAR(255) NOT NULL,
          "description" TEXT,
          "activity"    VARCHAR(255) NOT NULL,
          "members"     JSON         DEFAULT '[]',
          "posts"       JSON         DEFAULT '[]',
          "is_active"   BOOLEAN      DEFAULT true,
          "created_by"  VARCHAR(255) NOT NULL,
          "pays"        VARCHAR(255) DEFAULT '',
          "region"      VARCHAR(255) DEFAULT '',
          "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );`,
      indexes: [
        `CREATE INDEX IF NOT EXISTS idx_ag_activity  ON "activity_groups" ("activity");`,
        `CREATE INDEX IF NOT EXISTS idx_ag_is_active ON "activity_groups" ("is_active");`,
        `CREATE INDEX IF NOT EXISTS idx_ag_pays      ON "activity_groups" ("pays");`
      ],
      // Table existante : ajouter les nouvelles colonnes "pays"/"region" si absentes
      alters: [
        `ALTER TABLE "activity_groups" ADD COLUMN IF NOT EXISTS "pays" VARCHAR(255) DEFAULT '';`,
        `ALTER TABLE "activity_groups" ADD COLUMN IF NOT EXISTS "region" VARCHAR(255) DEFAULT '';`
      ]
    },
    {
      name: 'friends',
      sql: `
        CREATE TABLE IF NOT EXISTS "friends" (
          "id"              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
          "user_numero_h"   VARCHAR(255) NOT NULL,
          "friend_numero_h" VARCHAR(255) NOT NULL,
          "status"          VARCHAR(20)  NOT NULL DEFAULT 'accepted',
          "requested_at"    TIMESTAMPTZ  DEFAULT NOW(),
          "accepted_at"     TIMESTAMPTZ  DEFAULT NOW(),
          "mutual_friends"  INTEGER      DEFAULT 0,
          "common_interests" JSONB       DEFAULT '[]',
          "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );`,
      indexes: [
        `CREATE INDEX IF NOT EXISTS idx_fr_user   ON "friends" ("user_numero_h");`,
        `CREATE INDEX IF NOT EXISTS idx_fr_friend ON "friends" ("friend_numero_h");`,
        `CREATE INDEX IF NOT EXISTS idx_fr_status ON "friends" ("status");`
      ],
      alters: []
    },
    {
      name: 'friend_requests',
      sql: `
        CREATE TABLE IF NOT EXISTS "friend_requests" (
          "id"             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
          "from_user"      VARCHAR(255) NOT NULL,
          "fromUserName"   VARCHAR(255),
          "to_user"        VARCHAR(255) NOT NULL,
          "message"        TEXT,
          "status"         VARCHAR(20)  NOT NULL DEFAULT 'pending',
          "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );`,
      indexes: [
        `CREATE INDEX IF NOT EXISTS idx_freq_from   ON "friend_requests" ("from_user");`,
        `CREATE INDEX IF NOT EXISTS idx_freq_to     ON "friend_requests" ("to_user");`,
        `CREATE INDEX IF NOT EXISTS idx_freq_status ON "friend_requests" ("status");`
      ],
      alters: []
    }
  ];

  for (const table of tables) {
    try {
      await sequelize.query(table.sql);
      for (const idx of (table.indexes || [])) await sequelize.query(idx).catch(() => {});
      for (const alt of (table.alters  || [])) await sequelize.query(alt).catch(() => {});
      console.log(`✅ Table prête : ${table.name}`);
    } catch (err) {
      console.warn(`⚠️ initAllTables [${table.name}]:`, err.message);
    }
  }

  // Tables logos et user_logos (badges visuels assignés aux utilisateurs)
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "logos" (
        "id"          SERIAL PRIMARY KEY,
        "name"        VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL DEFAULT '',
        "icon"        VARCHAR(255) DEFAULT '👤',
        "color"       VARCHAR(255) DEFAULT '#3B82F6',
        "category"    VARCHAR(255) DEFAULT 'personal',
        "is_active"   BOOLEAN DEFAULT true,
        "created_by"  VARCHAR(255) NOT NULL DEFAULT 'admin',
        "usage_count" INTEGER DEFAULT 0,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "user_logos" (
        "id"          SERIAL PRIMARY KEY,
        "numero_h"    VARCHAR(255) NOT NULL,
        "logo_id"     INTEGER NOT NULL REFERENCES "logos"("id") ON DELETE CASCADE,
        "assigned_by" VARCHAR(255) NOT NULL DEFAULT 'admin',
        "assigned_at" TIMESTAMPTZ DEFAULT NOW(),
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(`ALTER TABLE "user_logos" ADD COLUMN IF NOT EXISTS "note" TEXT;`).catch(() => {});
    console.log('✅ Tables logos + user_logos prêtes');
  } catch (err) {
    console.warn('⚠️ initAllTables [logos]:', err.message);
  }

  // Colonne audio sur exchange_products (photo + audio 30s)
  try {
    await sequelize.query(`ALTER TABLE "exchange_products" ADD COLUMN IF NOT EXISTS "audio" JSONB DEFAULT '[]';`).catch(() => {});
  } catch (_) {}

  // media_url doit être TEXT (base64 data URLs)
  await sequelize.query(`ALTER TABLE "family_tree_messages" ALTER COLUMN "media_url" TYPE TEXT;`).catch(() => {});

  // Colonnes ajoutées récemment sur users (visibilité arbre généalogique)
  const userAlters = [
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tree_visibility" VARCHAR(50) DEFAULT 'name_photo_numeroH';`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tree_hidden" JSONB DEFAULT '[]';`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gallery_albums" TEXT;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet" DECIMAL(10,2) DEFAULT 0.00;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet_currency" VARCHAR(10) DEFAULT 'GNF';`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "user_stories" TEXT DEFAULT '{}';`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "children_photos" TEXT;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "family_photo" TEXT;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "man_photo" TEXT;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wife_photo" TEXT;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lieu_residence_1" VARCHAR(255);`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lieu_residence_2" VARCHAR(255);`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lieu_residence_3" VARCHAR(255);`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "prefecture" VARCHAR(255);`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sous_prefecture" VARCHAR(255);`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nb_femmes" INTEGER DEFAULT 0;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "annees_avant_naissance" INTEGER;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "annees_depuis_deces" INTEGER;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fingerprint" TEXT;`
  ];
  for (const sql of userAlters) {
    await sequelize.query(sql).catch(() => {});
  }
  console.log('✅ Colonnes users vérifiées');

  // Nouvelles colonnes family_trees (code unique F+S) + ia_conversations (numero_h)
  const treeAlters = [
    `ALTER TABLE "family_trees" ADD COLUMN IF NOT EXISTS "family_code"  VARCHAR(255) UNIQUE;`,
    `ALTER TABLE "family_trees" ADD COLUMN IF NOT EXISTS "blood_number" INTEGER;`,
    `ALTER TABLE "family_trees" ADD COLUMN IF NOT EXISTS "family_name"  VARCHAR(255);`
  ];
  for (const sql of treeAlters) await sequelize.query(sql).catch(() => {});

  // ia_conversations (numero_h) : géré par connectDB_IA() via sync({ alter: true })
  console.log('✅ Colonnes family_trees vérifiées');

  // ── GESTION INTERNE : cliniques & écoles ──────────────────────────────────
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "management_tenants" (
        "id"                      SERIAL PRIMARY KEY,
        "tenant_code"             VARCHAR(50) UNIQUE NOT NULL,
        "type"                    VARCHAR(20) NOT NULL,
        "name"                    VARCHAR(255) NOT NULL,
        "logo_url"                TEXT,
        "owner_numero_h"          VARCHAR(100) NOT NULL,
        "professional_account_id" INTEGER,
        "is_active"               BOOLEAN DEFAULT true,
        "activated_at"            TIMESTAMPTZ DEFAULT NOW(),
        "created_at"              TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "clinic_patients" (
        "id"               SERIAL PRIMARY KEY,
        "tenant_code"      VARCHAR(50) NOT NULL,
        "nom"              VARCHAR(255) NOT NULL,
        "prenom"           VARCHAR(255) NOT NULL,
        "date_naissance"   DATE,
        "sexe"             VARCHAR(10),
        "telephone"        VARCHAR(50),
        "adresse"          TEXT,
        "numero_matricule" VARCHAR(100),
        "groupe_sanguin"   VARCHAR(10),
        "allergies"        TEXT,
        "created_at"       TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "clinic_staff" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "prenom"      VARCHAR(255) NOT NULL,
        "role"        VARCHAR(50) NOT NULL,
        "service"     VARCHAR(255),
        "specialite"  VARCHAR(255),
        "telephone"   VARCHAR(50),
        "email"       VARCHAR(255),
        "matricule"   VARCHAR(100),
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "clinic_appointments_mgmt" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "patient_id"  INTEGER REFERENCES "clinic_patients"("id") ON DELETE SET NULL,
        "staff_id"    INTEGER REFERENCES "clinic_staff"("id") ON DELETE SET NULL,
        "service"     VARCHAR(255),
        "date_rdv"    DATE NOT NULL,
        "heure"       VARCHAR(10),
        "statut"      VARCHAR(20) DEFAULT 'pending',
        "motif"       TEXT,
        "notes"       TEXT,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "clinic_prescriptions" (
        "id"              SERIAL PRIMARY KEY,
        "tenant_code"     VARCHAR(50) NOT NULL,
        "patient_id"      INTEGER REFERENCES "clinic_patients"("id") ON DELETE SET NULL,
        "staff_id"        INTEGER REFERENCES "clinic_staff"("id") ON DELETE SET NULL,
        "date_prescription" DATE DEFAULT CURRENT_DATE,
        "medicaments"     JSONB DEFAULT '[]',
        "diagnostic"      TEXT,
        "notes"           TEXT,
        "numero_ordo"     VARCHAR(100),
        "created_at"      TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "clinic_medical_records" (
        "id"               SERIAL PRIMARY KEY,
        "tenant_code"      VARCHAR(50) NOT NULL,
        "patient_id"       INTEGER REFERENCES "clinic_patients"("id") ON DELETE SET NULL,
        "staff_id"         INTEGER REFERENCES "clinic_staff"("id") ON DELETE SET NULL,
        "date_visite"      DATE DEFAULT CURRENT_DATE,
        "type_consultation" VARCHAR(100),
        "diagnostic"       TEXT,
        "traitement"       TEXT,
        "poids"            DECIMAL,
        "tension"          VARCHAR(20),
        "temperature"      DECIMAL,
        "created_at"       TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "clinic_payments_mgmt" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "patient_id"   INTEGER REFERENCES "clinic_patients"("id") ON DELETE SET NULL,
        "montant"      DECIMAL(15,0) NOT NULL,
        "motif"        VARCHAR(255),
        "date_paiement" DATE DEFAULT CURRENT_DATE,
        "mode_paiement" VARCHAR(50) DEFAULT 'especes',
        "recu_numero"  VARCHAR(100),
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "school_students" (
        "id"               SERIAL PRIMARY KEY,
        "tenant_code"      VARCHAR(50) NOT NULL,
        "nom"              VARCHAR(255) NOT NULL,
        "prenom"           VARCHAR(255) NOT NULL,
        "date_naissance"   DATE,
        "sexe"             VARCHAR(10),
        "telephone_parent" VARCHAR(50),
        "nom_parent"       VARCHAR(255),
        "adresse"          TEXT,
        "classroom_id"     INTEGER,
        "numero_matricule" VARCHAR(100),
        "statut"           VARCHAR(20) DEFAULT 'actif',
        "created_at"       TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "school_staff" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "prenom"      VARCHAR(255) NOT NULL,
        "role"        VARCHAR(50) NOT NULL,
        "matieres"    JSONB DEFAULT '[]',
        "telephone"   VARCHAR(50),
        "email"       VARCHAR(255),
        "matricule"   VARCHAR(100),
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "school_classrooms" (
        "id"                      SERIAL PRIMARY KEY,
        "tenant_code"             VARCHAR(50) NOT NULL,
        "nom"                     VARCHAR(255) NOT NULL,
        "niveau"                  VARCHAR(100),
        "capacite"                INTEGER DEFAULT 30,
        "professeur_principal_id" INTEGER REFERENCES "school_staff"("id") ON DELETE SET NULL,
        "created_at"              TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "school_attendance" (
        "id"             SERIAL PRIMARY KEY,
        "tenant_code"    VARCHAR(50) NOT NULL,
        "student_id"     INTEGER REFERENCES "school_students"("id") ON DELETE CASCADE,
        "classroom_id"   INTEGER REFERENCES "school_classrooms"("id") ON DELETE SET NULL,
        "date_presence"  DATE NOT NULL,
        "est_present"    BOOLEAN DEFAULT true,
        "motif_absence"  TEXT,
        "created_at"     TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "school_grades" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "student_id"   INTEGER REFERENCES "school_students"("id") ON DELETE CASCADE,
        "classroom_id" INTEGER REFERENCES "school_classrooms"("id") ON DELETE SET NULL,
        "matiere"      VARCHAR(255) NOT NULL,
        "note"         DECIMAL(5,2),
        "note_max"     DECIMAL(5,2) DEFAULT 20,
        "coefficient"  INTEGER DEFAULT 1,
        "periode"      VARCHAR(50),
        "commentaire"  TEXT,
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "school_fees" (
        "id"            SERIAL PRIMARY KEY,
        "tenant_code"   VARCHAR(50) NOT NULL,
        "student_id"    INTEGER REFERENCES "school_students"("id") ON DELETE CASCADE,
        "montant"       DECIMAL(15,0) NOT NULL,
        "montant_paye"  DECIMAL(15,0) DEFAULT 0,
        "type_frais"    VARCHAR(100),
        "periode"       VARCHAR(50),
        "date_paiement" DATE,
        "est_paye"      BOOLEAN DEFAULT false,
        "created_at"    TIMESTAMPTZ DEFAULT NOW()
      );
      -- Membres école liés par numéroH
      CREATE TABLE IF NOT EXISTS "school_members" (
        "id"                SERIAL PRIMARY KEY,
        "tenant_code"       VARCHAR(50) NOT NULL,
        "numero_h"          VARCHAR(50) NOT NULL,
        "role"              VARCHAR(20) NOT NULL DEFAULT 'parent',
        "linked_student_id" INTEGER REFERENCES "school_students"("id") ON DELETE SET NULL,
        "nom_display"       VARCHAR(255),
        "added_by"          VARCHAR(50),
        "is_active"         BOOLEAN DEFAULT true,
        "created_at"        TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_code, numero_h)
      );
      -- Carnet d'accès générique : personnes liées à un compte pro (tous types)
      CREATE TABLE IF NOT EXISTS "professional_account_members" (
        "id"                       SERIAL PRIMARY KEY,
        "professional_account_id" UUID NOT NULL,
        "numero_h"                 VARCHAR(50) NOT NULL,
        "role"                     VARCHAR(50) NOT NULL DEFAULT 'client',
        "nom_display"              VARCHAR(255),
        "added_by"                 VARCHAR(50),
        "is_active"                BOOLEAN DEFAULT true,
        "created_at"               TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE("professional_account_id", "numero_h")
      );
      CREATE INDEX IF NOT EXISTS idx_pam_numero_h ON "professional_account_members"("numero_h");
      -- Bulletins de notes
      CREATE TABLE IF NOT EXISTS "school_bulletins" (
        "id"               SERIAL PRIMARY KEY,
        "tenant_code"      VARCHAR(50) NOT NULL,
        "student_id"       INTEGER REFERENCES "school_students"("id") ON DELETE CASCADE,
        "periode"          VARCHAR(50) NOT NULL,
        "annee_scolaire"   VARCHAR(20),
        "moyenne_generale" DECIMAL(5,2),
        "rang"             INTEGER,
        "effectif"         INTEGER,
        "mention"          VARCHAR(100),
        "appreciation"     TEXT,
        "is_published"     BOOLEAN DEFAULT false,
        "published_at"     TIMESTAMPTZ,
        "created_at"       TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_code, student_id, periode)
      );
      -- Mosquée
      CREATE TABLE IF NOT EXISTS "mosque_members" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "prenom"      VARCHAR(255),
        "telephone"   VARCHAR(50),
        "numero_h"    VARCHAR(50),
        "role"        VARCHAR(50) DEFAULT 'fidèle',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "mosque_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(255) NOT NULL,
        "contenu"     TEXT NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'general',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "mosque_donations" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "donateur_nom" VARCHAR(255),
        "montant"      DECIMAL(15,0) NOT NULL,
        "type_don"     VARCHAR(50) DEFAULT 'sadaqa',
        "date_don"     DATE DEFAULT CURRENT_DATE,
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "mosque_quran_students" (
        "id"               SERIAL PRIMARY KEY,
        "tenant_code"      VARCHAR(50) NOT NULL,
        "nom"              VARCHAR(255) NOT NULL,
        "prenom"           VARCHAR(255),
        "niveau_coran"     VARCHAR(100) DEFAULT 'Débutant',
        "telephone_parent" VARCHAR(50),
        "enseignant_id"    INTEGER REFERENCES "mosque_members"("id") ON DELETE SET NULL,
        "statut"           VARCHAR(20) DEFAULT 'actif',
        "created_at"       TIMESTAMPTZ DEFAULT NOW()
      );
      -- Imams mosquée (jusqu'à 3 cheikh imams par mosquée)
      CREATE TABLE IF NOT EXISTS "mosque_imams" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "rang"        INTEGER NOT NULL DEFAULT 1,
        "nom"         VARCHAR(255) NOT NULL,
        "prenom"      VARCHAR(255),
        "telephone"   VARCHAR(50),
        "numero_h"    VARCHAR(100),
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_mosque_imam_rang UNIQUE (tenant_code, rang)
      );
      -- Réseau / Association générique
      CREATE TABLE IF NOT EXISTS "reseau_members" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "prenom"      VARCHAR(255),
        "telephone"   VARCHAR(50),
        "email"       VARCHAR(255),
        "numero_h"    VARCHAR(100),
        "role"        VARCHAR(100) DEFAULT 'membre',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "reseau_projets" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(255) NOT NULL,
        "description" TEXT,
        "statut"      VARCHAR(50) DEFAULT 'en_cours',
        "responsable" VARCHAR(255),
        "date_debut"  DATE,
        "date_fin"    DATE,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "reseau_cotisations" (
        "id"             SERIAL PRIMARY KEY,
        "tenant_code"    VARCHAR(50) NOT NULL,
        "membre_nom"     VARCHAR(255),
        "montant"        DECIMAL(15,0) DEFAULT 0,
        "type_cot"       VARCHAR(50) DEFAULT 'mensuelle',
        "periode"        VARCHAR(50),
        "est_paye"       BOOLEAN DEFAULT true,
        "date_paiement"  TIMESTAMPTZ DEFAULT NOW(),
        "created_at"     TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "reseau_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(255) NOT NULL,
        "contenu"     TEXT NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'general',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      -- Immobilier
      CREATE TABLE IF NOT EXISTS "immo_properties" (
        "id"            SERIAL PRIMARY KEY,
        "tenant_code"   VARCHAR(50) NOT NULL,
        "nom"           VARCHAR(255) NOT NULL,
        "type_bien"     VARCHAR(100) DEFAULT 'appartement',
        "adresse"       VARCHAR(255),
        "ville"         VARCHAR(100),
        "surface"       DECIMAL(10,2),
        "nb_pieces"     INTEGER,
        "loyer_mensuel" DECIMAL(15,2) DEFAULT 0,
        "charges"       DECIMAL(15,2) DEFAULT 0,
        "statut"        VARCHAR(50) DEFAULT 'vacant',
        "description"   TEXT,
        "created_at"    TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "immo_tenants" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "prenom"      VARCHAR(255),
        "telephone"   VARCHAR(50),
        "email"       VARCHAR(255),
        "cni"         VARCHAR(100),
        "property_id" INTEGER REFERENCES immo_properties(id) ON DELETE SET NULL,
        "date_entree" DATE,
        "loyer"       DECIMAL(15,2) DEFAULT 0,
        "caution"     DECIMAL(15,2) DEFAULT 0,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "immo_payments" (
        "id"             SERIAL PRIMARY KEY,
        "tenant_code"    VARCHAR(50) NOT NULL,
        "tenant_id"      INTEGER REFERENCES immo_tenants(id) ON DELETE SET NULL,
        "property_id"    INTEGER REFERENCES immo_properties(id) ON DELETE SET NULL,
        "montant"        DECIMAL(15,2) DEFAULT 0,
        "mois_concerne"  VARCHAR(7),
        "type_paiement"  VARCHAR(50) DEFAULT 'especes',
        "statut"         VARCHAR(50) DEFAULT 'paye',
        "notes"          TEXT,
        "date_paiement"  TIMESTAMPTZ DEFAULT NOW(),
        "created_at"     TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "immo_leases" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "tenant_id"   INTEGER REFERENCES immo_tenants(id) ON DELETE SET NULL,
        "property_id" INTEGER REFERENCES immo_properties(id) ON DELETE SET NULL,
        "date_debut"  DATE,
        "date_fin"    DATE,
        "statut"      VARCHAR(50) DEFAULT 'actif',
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "immo_maintenance" (
        "id"                SERIAL PRIMARY KEY,
        "tenant_code"       VARCHAR(50) NOT NULL,
        "property_id"       INTEGER REFERENCES immo_properties(id) ON DELETE SET NULL,
        "titre"             VARCHAR(255) NOT NULL,
        "description"       TEXT,
        "type_intervention" VARCHAR(100) DEFAULT 'reparation',
        "priorite"          VARCHAR(50) DEFAULT 'normale',
        "cout_estime"       DECIMAL(15,2) DEFAULT 0,
        "statut"            VARCHAR(50) DEFAULT 'en_cours',
        "created_at"        TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "immo_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(255) NOT NULL,
        "contenu"     TEXT NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'general',
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      -- Restaurant
      CREATE TABLE IF NOT EXISTS "resto_dishes" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "categorie"   VARCHAR(100) DEFAULT 'Plat principal',
        "prix"        DECIMAL(15,2) DEFAULT 0,
        "description" TEXT,
        "disponible"  BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "resto_tables" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "numero"      VARCHAR(20) NOT NULL,
        "capacite"    INTEGER DEFAULT 4,
        "zone"        VARCHAR(100) DEFAULT 'Salle',
        "statut"      VARCHAR(50) DEFAULT 'libre',
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "resto_orders" (
        "id"            SERIAL PRIMARY KEY,
        "tenant_code"   VARCHAR(50) NOT NULL,
        "table_id"      INTEGER REFERENCES resto_tables(id) ON DELETE SET NULL,
        "table_num"     VARCHAR(20),
        "items"         JSONB DEFAULT '[]',
        "total"         DECIMAL(15,2) DEFAULT 0,
        "type_service"  VARCHAR(50) DEFAULT 'sur_place',
        "type_paiement" VARCHAR(50) DEFAULT 'especes',
        "notes"         TEXT,
        "statut"        VARCHAR(50) DEFAULT 'en_preparation',
        "created_at"    TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "resto_staff" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "prenom"      VARCHAR(255),
        "poste"       VARCHAR(100) DEFAULT 'Serveur',
        "telephone"   VARCHAR(50),
        "salaire"     DECIMAL(15,2) DEFAULT 0,
        "actif"       BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "resto_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(255) NOT NULL,
        "contenu"     TEXT NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'general',
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "mosque_predications" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(255) NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'khutba',
        "contenu"     TEXT,
        "sourate"     VARCHAR(100),
        "date_pred"   DATE DEFAULT CURRENT_DATE,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "mosque_partenaires" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom_mosquee" VARCHAR(255) NOT NULL,
        "ville"       VARCHAR(100),
        "imam_nom"    VARCHAR(255),
        "telephone"   VARCHAR(50),
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      -- Réseau Imam
      CREATE TABLE IF NOT EXISTS "imam_network_imams" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "prenom"      VARCHAR(255),
        "telephone"   VARCHAR(50),
        "numero_h"    VARCHAR(100),
        "specialite"  VARCHAR(100) DEFAULT 'Général',
        "mosquee"     VARCHAR(255),
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "imam_network_predications" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "imam_id"     INTEGER REFERENCES "imam_network_imams"("id") ON DELETE SET NULL,
        "imam_nom"    VARCHAR(255),
        "titre"       VARCHAR(255) NOT NULL,
        "type_pred"   VARCHAR(50) DEFAULT 'khutba',
        "date_pred"   DATE DEFAULT CURRENT_DATE,
        "mosquee"     VARCHAR(255),
        "notes"       TEXT,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "imam_network_mosques" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "nom"          VARCHAR(255) NOT NULL,
        "adresse"      VARCHAR(255),
        "responsable"  VARCHAR(255),
        "telephone"    VARCHAR(50),
        "is_active"    BOOLEAN DEFAULT true,
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "imam_network_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(255) NOT NULL,
        "contenu"     TEXT NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'general',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "imam_network_members" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "prenom"      VARCHAR(255),
        "telephone"   VARCHAR(50),
        "numero_h"    VARCHAR(100),
        "role"        VARCHAR(100) DEFAULT 'fidèle',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "imam_network_donations" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "donateur_nom" VARCHAR(255) DEFAULT 'Anonyme',
        "montant"      NUMERIC(12,2) NOT NULL,
        "type_don"     VARCHAR(50) DEFAULT 'sadaqa',
        "date_don"     DATE DEFAULT CURRENT_DATE,
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "imam_network_quran_students" (
        "id"               SERIAL PRIMARY KEY,
        "tenant_code"      VARCHAR(50) NOT NULL,
        "nom"              VARCHAR(255) NOT NULL,
        "prenom"           VARCHAR(255),
        "niveau_coran"     VARCHAR(100) DEFAULT 'Débutant',
        "telephone_parent" VARCHAR(50),
        "statut"           VARCHAR(20) DEFAULT 'actif',
        "created_at"       TIMESTAMPTZ DEFAULT NOW()
      );
      -- ONG & Associations
      CREATE TABLE IF NOT EXISTS "ngo_members" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "prenom"      VARCHAR(255),
        "telephone"   VARCHAR(50),
        "numero_h"    VARCHAR(100),
        "role"        VARCHAR(100) DEFAULT 'bénévole',
        "competence"  VARCHAR(255),
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "ngo_projects" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "titre"        VARCHAR(255) NOT NULL,
        "description"  TEXT,
        "statut"       VARCHAR(50) DEFAULT 'en_cours',
        "date_debut"   DATE DEFAULT CURRENT_DATE,
        "date_fin"     DATE,
        "budget"       DECIMAL(15,0) DEFAULT 0,
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "ngo_donations" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "donateur_nom" VARCHAR(255),
        "montant"      DECIMAL(15,0) NOT NULL,
        "type_don"     VARCHAR(50) DEFAULT 'financier',
        "projet_id"    INTEGER REFERENCES "ngo_projects"("id") ON DELETE SET NULL,
        "projet_titre" VARCHAR(255),
        "date_don"     DATE DEFAULT CURRENT_DATE,
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "ngo_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(255) NOT NULL,
        "contenu"     TEXT NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'general',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      -- Journalistes / Médias
      CREATE TABLE IF NOT EXISTS "journalist_reporters" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "prenom"      VARCHAR(255),
        "telephone"   VARCHAR(50),
        "numero_h"    VARCHAR(100),
        "specialite"  VARCHAR(100) DEFAULT 'Général',
        "role"        VARCHAR(100) DEFAULT 'journaliste',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "journalist_articles" (
        "id"            SERIAL PRIMARY KEY,
        "tenant_code"   VARCHAR(50) NOT NULL,
        "reporter_id"   INTEGER REFERENCES "journalist_reporters"("id") ON DELETE SET NULL,
        "reporter_nom"  VARCHAR(255),
        "titre"         VARCHAR(255) NOT NULL,
        "contenu"       TEXT,
        "categorie"     VARCHAR(100) DEFAULT 'Actualité',
        "statut"        VARCHAR(50) DEFAULT 'brouillon',
        "date_pub"      DATE DEFAULT CURRENT_DATE,
        "created_at"    TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "journalist_subscribers" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "telephone"   VARCHAR(50),
        "email"       VARCHAR(255),
        "type_abo"    VARCHAR(50) DEFAULT 'gratuit',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "journalist_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(255) NOT NULL,
        "contenu"     TEXT NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'general',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      -- Scientifiques
      CREATE TABLE IF NOT EXISTS "scientist_members" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "nom"          VARCHAR(255) NOT NULL,
        "prenom"       VARCHAR(255),
        "telephone"    VARCHAR(50),
        "numero_h"     VARCHAR(100),
        "titre"        VARCHAR(100) DEFAULT 'Chercheur',
        "domaine"      VARCHAR(255),
        "institution"  VARCHAR(255),
        "is_active"    BOOLEAN DEFAULT true,
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "scientist_publications" (
        "id"            SERIAL PRIMARY KEY,
        "tenant_code"   VARCHAR(50) NOT NULL,
        "auteur_id"     INTEGER REFERENCES "scientist_members"("id") ON DELETE SET NULL,
        "auteur_nom"    VARCHAR(255),
        "titre"         VARCHAR(255) NOT NULL,
        "type_pub"      VARCHAR(100) DEFAULT 'article',
        "domaine"       VARCHAR(100),
        "statut"        VARCHAR(50) DEFAULT 'en_cours',
        "date_pub"      DATE DEFAULT CURRENT_DATE,
        "resume"        TEXT,
        "created_at"    TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "scientist_projects" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "titre"        VARCHAR(255) NOT NULL,
        "description"  TEXT,
        "responsable"  VARCHAR(255),
        "statut"       VARCHAR(50) DEFAULT 'en_cours',
        "date_debut"   DATE DEFAULT CURRENT_DATE,
        "date_fin"     DATE,
        "budget"       DECIMAL(15,0) DEFAULT 0,
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "scientist_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(255) NOT NULL,
        "contenu"     TEXT NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'general',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      -- Fournisseurs / Grossistes
      CREATE TABLE IF NOT EXISTS "supplier_products" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "categorie"   VARCHAR(100),
        "prix_gros"   DECIMAL(15,0) DEFAULT 0,
        "prix_detail" DECIMAL(15,0) DEFAULT 0,
        "stock"       INTEGER DEFAULT 0,
        "unite"       VARCHAR(50) DEFAULT 'unité',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "supplier_clients" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "telephone"   VARCHAR(50),
        "adresse"     VARCHAR(255),
        "type_client" VARCHAR(50) DEFAULT 'revendeur',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "supplier_orders" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "client_nom"   VARCHAR(255),
        "client_id"    INTEGER REFERENCES "supplier_clients"("id") ON DELETE SET NULL,
        "montant_total" DECIMAL(15,0) DEFAULT 0,
        "statut"       VARCHAR(50) DEFAULT 'en_attente',
        "date_commande" DATE DEFAULT CURRENT_DATE,
        "notes"        TEXT,
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "supplier_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(255) NOT NULL,
        "contenu"     TEXT NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'general',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      -- Agences de Sécurité
      CREATE TABLE IF NOT EXISTS "security_agents" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "prenom"      VARCHAR(255),
        "telephone"   VARCHAR(50),
        "numero_h"    VARCHAR(100),
        "grade"       VARCHAR(100) DEFAULT 'Agent',
        "zone"        VARCHAR(255),
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "security_missions" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "agent_id"     INTEGER,
        "agent_nom"    VARCHAR(255),
        "titre"        VARCHAR(255) NOT NULL,
        "client_nom"   VARCHAR(255),
        "lieu"         VARCHAR(255),
        "date_debut"   DATE DEFAULT CURRENT_DATE,
        "date_fin"     DATE,
        "statut"       VARCHAR(50) DEFAULT 'en_cours',
        "notes"        TEXT,
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "security_clients" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "telephone"   VARCHAR(50),
        "adresse"     VARCHAR(255),
        "type_contrat" VARCHAR(100) DEFAULT 'ponctuel',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "security_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(255) NOT NULL,
        "contenu"     TEXT NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'general',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      -- Entreprises
      CREATE TABLE IF NOT EXISTS "enterprise_employees" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "prenom"      VARCHAR(255),
        "telephone"   VARCHAR(50),
        "numero_h"    VARCHAR(100),
        "poste"       VARCHAR(100) DEFAULT 'Employé',
        "departement" VARCHAR(100),
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "enterprise_clients" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "nom"          VARCHAR(255) NOT NULL,
        "telephone"    VARCHAR(50),
        "adresse"      VARCHAR(255),
        "secteur"      VARCHAR(100),
        "is_active"    BOOLEAN DEFAULT true,
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "enterprise_contracts" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(255) NOT NULL,
        "client_nom"  VARCHAR(255),
        "client_id"   INTEGER REFERENCES "enterprise_clients"("id") ON DELETE SET NULL,
        "budget"      DECIMAL(15,0) DEFAULT 0,
        "statut"      VARCHAR(50) DEFAULT 'en_cours',
        "date_debut"  DATE DEFAULT CURRENT_DATE,
        "date_fin"    DATE,
        "description" TEXT,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "enterprise_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "titre"       VARCHAR(255) NOT NULL,
        "contenu"     TEXT NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'general',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      -- Gestionnaires de quartier (1 chef + 1 gestionnaire de caisse)
      CREATE TABLE IF NOT EXISTS "quartier_managers" (
        "id"                    SERIAL PRIMARY KEY,
        "quartier_nom"          VARCHAR(255) NOT NULL UNIQUE,
        "chef_numero_h"         VARCHAR(100),
        "chef_nom"              VARCHAR(255),
        "gestionnaire_numero_h" VARCHAR(100),
        "gestionnaire_nom"      VARCHAR(255),
        "created_at"            TIMESTAMPTZ DEFAULT NOW(),
        "updated_at"            TIMESTAMPTZ DEFAULT NOW()
      );
      -- Commerce / Boutique
      CREATE TABLE IF NOT EXISTS "commerce_products" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL,
        "nom"         VARCHAR(255) NOT NULL,
        "categorie"   VARCHAR(100),
        "prix_vente"  DECIMAL(15,0) NOT NULL DEFAULT 0,
        "prix_achat"  DECIMAL(15,0) DEFAULT 0,
        "stock"       INTEGER DEFAULT 0,
        "stock_min"   INTEGER DEFAULT 5,
        "unite"       VARCHAR(50) DEFAULT 'pièce',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "commerce_sales" (
        "id"            SERIAL PRIMARY KEY,
        "tenant_code"   VARCHAR(50) NOT NULL,
        "client_nom"    VARCHAR(255),
        "total"         DECIMAL(15,0) NOT NULL DEFAULT 0,
        "montant_recu"  DECIMAL(15,0) DEFAULT 0,
        "type_paiement" VARCHAR(50) DEFAULT 'especes',
        "est_credit"    BOOLEAN DEFAULT false,
        "notes"         TEXT,
        "items"         JSONB DEFAULT '[]',
        "date_vente"    TIMESTAMPTZ DEFAULT NOW(),
        "created_at"    TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "commerce_clients" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "nom"          VARCHAR(255) NOT NULL,
        "telephone"    VARCHAR(50),
        "adresse"      TEXT,
        "credit_total" DECIMAL(15,0) DEFAULT 0,
        "is_active"    BOOLEAN DEFAULT true,
        "created_at"   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "commerce_expenses" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(50) NOT NULL,
        "description"  VARCHAR(300) NOT NULL,
        "montant"      DECIMAL(15,0) NOT NULL DEFAULT 0,
        "categorie"    VARCHAR(100) DEFAULT 'Autre',
        "date_depense" TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Colonnes supplémentaires (idempotentes)
    await sequelize.query(`ALTER TABLE "professional_accounts" ADD COLUMN IF NOT EXISTS "tenant_code" VARCHAR(50) UNIQUE;`).catch(() => {});
    await sequelize.query(`ALTER TABLE "professional_accounts" ADD COLUMN IF NOT EXISTS "gestion_interne_valid_until" TIMESTAMPTZ;`).catch(() => {});
    await sequelize.query(`ALTER TABLE "school_students" ADD COLUMN IF NOT EXISTS "numero_h" VARCHAR(50);`).catch(() => {});
    await sequelize.query(`ALTER TABLE "school_students" ADD COLUMN IF NOT EXISTS "parent_numero_h" VARCHAR(50);`).catch(() => {});
    await sequelize.query(`ALTER TABLE "management_tenants" ADD COLUMN IF NOT EXISTS "address"      TEXT;`).catch(() => {});
    await sequelize.query(`ALTER TABLE "management_tenants" ADD COLUMN IF NOT EXISTS "phone"        VARCHAR(50);`).catch(() => {});
    await sequelize.query(`ALTER TABLE "management_tenants" ADD COLUMN IF NOT EXISTS "email"        VARCHAR(255);`).catch(() => {});
    await sequelize.query(`ALTER TABLE "management_tenants" ADD COLUMN IF NOT EXISTS "description"  TEXT;`).catch(() => {});
    await sequelize.query(`ALTER TABLE "management_tenants" ADD COLUMN IF NOT EXISTS "logo_url"     TEXT;`).catch(() => {});
    await sequelize.query(`ALTER TABLE "management_tenants" ADD COLUMN IF NOT EXISTS "city"         VARCHAR(255);`).catch(() => {});
    await sequelize.query(`ALTER TABLE "management_tenants" ADD COLUMN IF NOT EXISTS "is_active"    BOOLEAN DEFAULT true;`).catch(() => {});
    await sequelize.query(`ALTER TABLE "management_tenants" ADD COLUMN IF NOT EXISTS "activated_at" TIMESTAMPTZ DEFAULT NOW();`).catch(() => {});
    await sequelize.query(`ALTER TABLE "clinic_patients"       ADD COLUMN IF NOT EXISTS "numero_h"      VARCHAR(100);`).catch(() => {});
    await sequelize.query(`ALTER TABLE "clinic_prescriptions" ADD COLUMN IF NOT EXISTS "pharma_statut" VARCHAR(30) DEFAULT 'en_attente';`).catch(() => {});

    // Migration : créer tenant_code pour comptes pros approuvés+actifs sans tenant_code
    try {
      const missingTenants = await sequelize.query(
        `SELECT id, type, name, owner_numero_h FROM professional_accounts
         WHERE status='approved' AND subscription_status='active' AND (tenant_code IS NULL OR tenant_code='')
         AND type IN ('clinic','school','enterprise','mosque','madrasa','commerce','ngo','journalist','scientist','supplier','security_agency')`,
        { type: sequelize.QueryTypes.SELECT }
      );
      const prefixMap = { clinic:'CLIN', school:'ECO', enterprise:'ENT', mosque:'MSQ', madrasa:'MDS', commerce:'COM', ngo:'NGO', journalist:'JOUR', scientist:'SCIEN', supplier:'FOUR', security_agency:'SECU' };
      for (const acc of missingTenants) {
        const prefix = prefixMap[acc.type] || 'PRO';
        const code = `${prefix}-GN-${String(acc.id).padStart(5,'0')}`;
        await sequelize.query(
          `INSERT INTO management_tenants (tenant_code, type, name, owner_numero_h) VALUES (:code,:type,:name,:owner) ON CONFLICT (tenant_code) DO NOTHING`,
          { replacements: { code, type: acc.type, name: acc.name, owner: acc.owner_numero_h } }
        ).catch(()=>{});
        await sequelize.query(
          `UPDATE professional_accounts SET tenant_code=:code WHERE id=:id AND (tenant_code IS NULL OR tenant_code='')`,
          { replacements: { code, id: acc.id } }
        ).catch(()=>{});
      }
      if (missingTenants.length > 0) console.log(`✅ Migration tenant_code : ${missingTenants.length} compte(s) mis à jour`);
    } catch(e) { console.warn('⚠️ Migration tenant_code:', e.message); }

    // Tenants démo réservés à l'admin G7 — un exemplaire par type de service
    await sequelize.query(`
      INSERT INTO management_tenants (tenant_code, type, name, owner_numero_h, is_active)
      VALUES
        ('DEMO-REF-CLIN', 'clinic',           'Clinique Référence Admin',             'ADMIN-G7', true),
        ('DEMO-REF-ECO',  'school',           'École Référence Admin',                'ADMIN-G7', true),
        ('DEMO-REF-MSQ',  'mosque',           'Mosquée Référence Admin',              'ADMIN-G7', true),
        ('DEMO-REF-MDS',    'madrasa',  'Madrasa Référence Admin',              'ADMIN-G7', true),
        ('DEMO-REF-RESEAU', 'reseau',   'Réseau Référence Admin',               'ADMIN-G7', true),
        ('DEMO-REF-COM',  'commerce',         'Boutique Référence Admin',             'ADMIN-G7', true),
        ('DEMO-REF-ENT',  'enterprise',       'Entreprise Référence Admin',           'ADMIN-G7', true),
        ('DEMO-REF-IMAM', 'imam',             'Réseau Imam Référence Admin',          'ADMIN-G7', true),
        ('DEMO-REF-NGO',  'ngo',              'ONG Référence Admin',                  'ADMIN-G7', true),
        ('DEMO-REF-JOUR', 'journalist',       'Média Référence Admin',                'ADMIN-G7', true),
        ('DEMO-REF-SCIEN','scientist',        'Science Référence Admin',              'ADMIN-G7', true),
        ('DEMO-REF-FOUR', 'supplier',         'Fournisseur Référence Admin',          'ADMIN-G7', true),
        ('DEMO-REF-SECU',   'security_agency',  'Sécurité Référence Admin',             'ADMIN-G7', true),
        ('DEMO-REF-IMMO',   'immobilier',       'Immobilier Référence Admin',           'ADMIN-G7', true),
        ('DEMO-REF-RESTO',  'restaurant',       'Restaurant Référence Admin',           'ADMIN-G7', true),
        ('DEMO-REF-VENT', 'retailer',         'Vendeur Détail Référence Admin',        'ADMIN-G7', true),
        ('DEMO-REF-TRANS','transport',        'Transport Référence Admin',             'ADMIN-G7', true),
        ('DEMO-REF-MAIR', 'mairie',          'Mairie Référence Admin',                'ADMIN-G7', true)
      ON CONFLICT (tenant_code) DO NOTHING;
    `).catch(() => {});

    // ── Formation Religieuse (Madrasa / Daroul)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "madrasa_students" (
        "id"               SERIAL PRIMARY KEY,
        "tenant_code"      VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "prenom"           VARCHAR(100) NOT NULL,
        "nom"              VARCHAR(100) NOT NULL,
        "date_naissance"   DATE,
        "sexe"             CHAR(1) DEFAULT 'M',
        "niveau"           VARCHAR(50) DEFAULT 'Iqra',
        "telephone_parent" VARCHAR(50),
        "numero_h"         VARCHAR(30),
        "parent_numero_h"  VARCHAR(30),
        "is_active"        BOOLEAN DEFAULT true,
        "created_at"       TIMESTAMP DEFAULT NOW(),
        "updated_at"       TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "madrasa_staff" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "prenom"      VARCHAR(100) NOT NULL,
        "nom"         VARCHAR(100) NOT NULL,
        "role"        VARCHAR(50) DEFAULT 'Enseignant',
        "specialite"  VARCHAR(100) DEFAULT 'Coran',
        "telephone"   VARCHAR(50),
        "numero_h"    VARCHAR(30),
        "created_at"  TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "madrasa_halaqas" (
        "id"            SERIAL PRIMARY KEY,
        "tenant_code"   VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "nom"           VARCHAR(100) NOT NULL,
        "niveau"        VARCHAR(50) DEFAULT 'Iqra',
        "capacite"      INTEGER DEFAULT 20,
        "enseignant_id" INTEGER REFERENCES "madrasa_staff"("id") ON DELETE SET NULL,
        "created_at"    TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "madrasa_attendance" (
        "id"            SERIAL PRIMARY KEY,
        "tenant_code"   VARCHAR(30) NOT NULL,
        "student_id"    INTEGER NOT NULL REFERENCES "madrasa_students"("id") ON DELETE CASCADE,
        "date_presence" DATE NOT NULL DEFAULT CURRENT_DATE,
        "statut"        VARCHAR(20) DEFAULT 'present',
        UNIQUE("tenant_code", "student_id", "date_presence")
      );
      CREATE TABLE IF NOT EXISTS "madrasa_grades" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(30) NOT NULL,
        "student_id"  INTEGER NOT NULL REFERENCES "madrasa_students"("id") ON DELETE CASCADE,
        "matiere"     VARCHAR(100) DEFAULT 'Coran',
        "note"        NUMERIC(5,2) DEFAULT 0,
        "note_max"    NUMERIC(5,2) DEFAULT 20,
        "periode"     VARCHAR(50),
        "sourate"     VARCHAR(100),
        "commentaire" TEXT,
        "created_at"  TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "madrasa_fees" (
        "id"            SERIAL PRIMARY KEY,
        "tenant_code"   VARCHAR(30) NOT NULL,
        "student_id"    INTEGER NOT NULL REFERENCES "madrasa_students"("id") ON DELETE CASCADE,
        "type_frais"    VARCHAR(100) DEFAULT 'Frais mensuels',
        "montant"       INTEGER NOT NULL,
        "echeance"      DATE,
        "est_paye"      BOOLEAN DEFAULT false,
        "date_paiement" TIMESTAMP,
        "created_at"    TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "madrasa_members" (
        "id"                SERIAL PRIMARY KEY,
        "tenant_code"       VARCHAR(30) NOT NULL,
        "numero_h"          VARCHAR(30) NOT NULL,
        "role"              VARCHAR(30) DEFAULT 'apprenant',
        "linked_student_id" INTEGER REFERENCES "madrasa_students"("id") ON DELETE SET NULL,
        "nom_display"       VARCHAR(200),
        "is_active"         BOOLEAN DEFAULT true,
        "created_at"        TIMESTAMP DEFAULT NOW(),
        UNIQUE("tenant_code", "numero_h")
      );
      CREATE TABLE IF NOT EXISTS "madrasa_bulletins" (
        "id"               SERIAL PRIMARY KEY,
        "tenant_code"      VARCHAR(30) NOT NULL,
        "student_id"       INTEGER NOT NULL REFERENCES "madrasa_students"("id") ON DELETE CASCADE,
        "periode"          VARCHAR(50) NOT NULL,
        "annee_scolaire"   VARCHAR(20),
        "moyenne_generale" NUMERIC(5,2),
        "mention"          VARCHAR(100),
        "is_published"     BOOLEAN DEFAULT false,
        "published_at"     TIMESTAMP,
        "created_at"       TIMESTAMP DEFAULT NOW(),
        UNIQUE("tenant_code", "student_id", "periode")
      );
    `).catch(() => {});

    // ── Vendeurs en Détail ──────────────────────────────────────────────────────
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "retailer_products" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "nom"         VARCHAR(200) NOT NULL,
        "categorie"   VARCHAR(100) DEFAULT '',
        "prix_vente"  INTEGER NOT NULL DEFAULT 0,
        "prix_achat"  INTEGER DEFAULT 0,
        "stock"       INTEGER DEFAULT 0,
        "stock_min"   INTEGER DEFAULT 5,
        "unite"       VARCHAR(30) DEFAULT 'pièce',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "retailer_sales" (
        "id"            SERIAL PRIMARY KEY,
        "tenant_code"   VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "client_nom"    VARCHAR(200) DEFAULT 'Client',
        "type_paiement" VARCHAR(30) DEFAULT 'especes',
        "total"         INTEGER NOT NULL DEFAULT 0,
        "est_credit"    BOOLEAN DEFAULT false,
        "notes"         TEXT DEFAULT '',
        "date_vente"    TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "retailer_sale_items" (
        "id"            SERIAL PRIMARY KEY,
        "sale_id"       INTEGER NOT NULL REFERENCES "retailer_sales"("id") ON DELETE CASCADE,
        "tenant_code"   VARCHAR(30) NOT NULL,
        "nom"           VARCHAR(200) NOT NULL,
        "product_id"    INTEGER REFERENCES "retailer_products"("id") ON DELETE SET NULL,
        "prix_unitaire" INTEGER NOT NULL DEFAULT 0,
        "quantite"      NUMERIC(10,2) DEFAULT 1,
        "sous_total"    INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS "retailer_clients" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "nom"          VARCHAR(200) NOT NULL,
        "telephone"    VARCHAR(50) DEFAULT '',
        "adresse"      VARCHAR(200) DEFAULT '',
        "credit_total" INTEGER DEFAULT 0,
        "is_active"    BOOLEAN DEFAULT true,
        "created_at"   TIMESTAMP DEFAULT NOW(),
        UNIQUE("tenant_code", "nom")
      );
      CREATE TABLE IF NOT EXISTS "retailer_expenses" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "description"  VARCHAR(300) NOT NULL,
        "montant"      INTEGER NOT NULL DEFAULT 0,
        "categorie"    VARCHAR(100) DEFAULT 'Autre',
        "date_depense" TIMESTAMP DEFAULT NOW()
      );
    `).catch(() => {});

    console.log('✅ Tables gestion interne (cliniques + écoles + mosquées + madrasa + commerce + vendeurs) prêtes');
  } catch (err) {
    console.warn('⚠️ initAllTables [gestion-interne]:', err.message);
  }

  // ── Beauté & Bien-être ─────────────────────────────────────────────────────
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "beauty_services" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "nom"         VARCHAR(200) NOT NULL,
        "categorie"   VARCHAR(100) DEFAULT 'Général',
        "prix"        INTEGER NOT NULL DEFAULT 0,
        "duree_min"   INTEGER DEFAULT 30,
        "description" TEXT DEFAULT '',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "beauty_staff" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "nom"         VARCHAR(100) NOT NULL,
        "prenom"      VARCHAR(100) DEFAULT '',
        "poste"       VARCHAR(100) DEFAULT 'Coiffeur/se',
        "telephone"   VARCHAR(50) DEFAULT '',
        "specialite"  VARCHAR(200) DEFAULT '',
        "salaire"     INTEGER DEFAULT 0,
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "beauty_bookings" (
        "id"                SERIAL PRIMARY KEY,
        "tenant_code"       VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "client_nom"        VARCHAR(200) NOT NULL,
        "client_telephone"  VARCHAR(50) DEFAULT '',
        "service_id"        INTEGER REFERENCES "beauty_services"("id") ON DELETE SET NULL,
        "staff_id"          INTEGER REFERENCES "beauty_staff"("id") ON DELETE SET NULL,
        "date_rdv"          DATE NOT NULL,
        "heure_rdv"         VARCHAR(10) DEFAULT '',
        "statut"            VARCHAR(30) DEFAULT 'en_attente',
        "notes"             TEXT DEFAULT '',
        "created_at"        TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "beauty_clients" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "nom"         VARCHAR(200) NOT NULL,
        "telephone"   VARCHAR(50) DEFAULT '',
        "email"       VARCHAR(200) DEFAULT '',
        "notes"       TEXT DEFAULT '',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMP DEFAULT NOW(),
        UNIQUE("tenant_code", "nom")
      );
      CREATE TABLE IF NOT EXISTS "beauty_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "titre"       VARCHAR(300) NOT NULL,
        "contenu"     TEXT NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'general',
        "created_at"  TIMESTAMP DEFAULT NOW()
      );
    `).catch(() => {});
    console.log('✅ Tables beauté prêtes');
  } catch (err) { console.warn('⚠️ initAllTables [beauty]:', err.message); }

  // ── Artisanat & Services ───────────────────────────────────────────────────
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "artisan_services" (
        "id"                SERIAL PRIMARY KEY,
        "tenant_code"       VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "nom"               VARCHAR(200) NOT NULL,
        "categorie"         VARCHAR(100) DEFAULT 'Général',
        "prix_base"         INTEGER DEFAULT 0,
        "description"       TEXT DEFAULT '',
        "zone_intervention" VARCHAR(200) DEFAULT '',
        "is_active"         BOOLEAN DEFAULT true,
        "created_at"        TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "artisan_clients" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "nom"         VARCHAR(200) NOT NULL,
        "telephone"   VARCHAR(50) DEFAULT '',
        "adresse"     VARCHAR(200) DEFAULT '',
        "email"       VARCHAR(200) DEFAULT '',
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMP DEFAULT NOW(),
        UNIQUE("tenant_code", "nom")
      );
      CREATE TABLE IF NOT EXISTS "artisan_interventions" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_code"  VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "client_id"    INTEGER REFERENCES "artisan_clients"("id") ON DELETE SET NULL,
        "service_id"   INTEGER REFERENCES "artisan_services"("id") ON DELETE SET NULL,
        "titre"        VARCHAR(300) NOT NULL,
        "description"  TEXT DEFAULT '',
        "adresse"      VARCHAR(300) DEFAULT '',
        "date_debut"   TIMESTAMP DEFAULT NOW(),
        "date_fin"     TIMESTAMP,
        "statut"       VARCHAR(30) DEFAULT 'en_attente',
        "priorite"     VARCHAR(30) DEFAULT 'normale',
        "cout_estime"  INTEGER DEFAULT 0,
        "cout_reel"    INTEGER DEFAULT 0,
        "notes"        TEXT DEFAULT '',
        "created_at"   TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "artisan_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "titre"       VARCHAR(300) NOT NULL,
        "contenu"     TEXT NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'general',
        "created_at"  TIMESTAMP DEFAULT NOW()
      );
    `).catch(() => {});
    console.log('✅ Tables artisan prêtes');
  } catch (err) { console.warn('⚠️ initAllTables [artisan]:', err.message); }

  // ── Entreprise de Production ───────────────────────────────────────────────
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "producer_products" (
        "id"            SERIAL PRIMARY KEY,
        "tenant_code"   VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "nom"           VARCHAR(200) NOT NULL,
        "categorie"     VARCHAR(100) DEFAULT 'Général',
        "unite"         VARCHAR(30) DEFAULT 'kg',
        "prix_unitaire" INTEGER DEFAULT 0,
        "stock"         INTEGER DEFAULT 0,
        "description"   TEXT DEFAULT '',
        "is_active"     BOOLEAN DEFAULT true,
        "created_at"    TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "producer_lots" (
        "id"                SERIAL PRIMARY KEY,
        "tenant_code"       VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "product_id"        INTEGER REFERENCES "producer_products"("id") ON DELETE SET NULL,
        "quantite_prevue"   NUMERIC(12,2) NOT NULL DEFAULT 0,
        "quantite_produite" NUMERIC(12,2) DEFAULT 0,
        "date_debut"        TIMESTAMP DEFAULT NOW(),
        "date_fin_prevue"   TIMESTAMP,
        "date_fin_reelle"   TIMESTAMP,
        "statut"            VARCHAR(30) DEFAULT 'en_attente',
        "notes"             TEXT DEFAULT '',
        "created_at"        TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "producer_orders" (
        "id"                     SERIAL PRIMARY KEY,
        "tenant_code"            VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "client_nom"             VARCHAR(200) NOT NULL,
        "client_telephone"       VARCHAR(50) DEFAULT '',
        "product_id"             INTEGER REFERENCES "producer_products"("id") ON DELETE SET NULL,
        "quantite"               NUMERIC(12,2) NOT NULL DEFAULT 1,
        "montant_total"          INTEGER DEFAULT 0,
        "statut"                 VARCHAR(30) DEFAULT 'en_attente',
        "date_livraison_prevue"  DATE,
        "date_livraison"         TIMESTAMP,
        "notes"                  TEXT DEFAULT '',
        "created_at"             TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "producer_staff" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "nom"         VARCHAR(100) NOT NULL,
        "prenom"      VARCHAR(100) DEFAULT '',
        "poste"       VARCHAR(100) DEFAULT 'Ouvrier',
        "telephone"   VARCHAR(50) DEFAULT '',
        "salaire"     INTEGER DEFAULT 0,
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "producer_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "titre"       VARCHAR(300) NOT NULL,
        "contenu"     TEXT NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'general',
        "created_at"  TIMESTAMP DEFAULT NOW()
      );
    `).catch(() => {});
    console.log('✅ Tables producteur prêtes');
  } catch (err) {
    console.warn('⚠️ initAllTables [gestion-interne]:', err.message);
  }

  // ── Mairie (État Civil) ────────────────────────────────────────────────────
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "mairie_mariages" (
        "id"               SERIAL PRIMARY KEY,
        "tenant_code"      VARCHAR(50) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "numero_dossier"   VARCHAR(50) UNIQUE NOT NULL,
        "epoux_nom"        VARCHAR(100) NOT NULL,
        "epoux_prenom"     VARCHAR(100) NOT NULL,
        "epoux_ddn"        DATE,
        "epoux_numero_h"   VARCHAR(50),
        "epouse_nom"       VARCHAR(100) NOT NULL,
        "epouse_prenom"    VARCHAR(100) NOT NULL,
        "epouse_ddn"       DATE,
        "epouse_numero_h"  VARCHAR(50),
        "date_mariage"     DATE NOT NULL,
        "lieu_mariage"     VARCHAR(200) DEFAULT '',
        "temoin1_nom"      VARCHAR(100),
        "temoin2_nom"      VARCHAR(100),
        "statut"           VARCHAR(30) DEFAULT 'en_attente',
        "notes"            TEXT,
        "created_at"       TIMESTAMPTZ DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "mairie_naissances" (
        "id"               SERIAL PRIMARY KEY,
        "tenant_code"      VARCHAR(50) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "numero_dossier"   VARCHAR(50) UNIQUE NOT NULL,
        "enfant_nom"       VARCHAR(100) NOT NULL,
        "enfant_prenom"    VARCHAR(100) NOT NULL,
        "date_naissance"   DATE NOT NULL,
        "lieu_naissance"   VARCHAR(200) DEFAULT '',
        "sexe"             VARCHAR(10) DEFAULT 'M',
        "pere_nom"         VARCHAR(100),
        "pere_prenom"      VARCHAR(100),
        "mere_nom"         VARCHAR(100),
        "mere_prenom"      VARCHAR(100),
        "declarant_nom"    VARCHAR(100),
        "statut"           VARCHAR(30) DEFAULT 'en_attente',
        "notes"            TEXT,
        "created_at"       TIMESTAMPTZ DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "mairie_deces" (
        "id"                   SERIAL PRIMARY KEY,
        "tenant_code"          VARCHAR(50) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "numero_dossier"       VARCHAR(50) UNIQUE NOT NULL,
        "defunt_nom"           VARCHAR(100) NOT NULL,
        "defunt_prenom"        VARCHAR(100) NOT NULL,
        "defunt_ddn"           DATE,
        "defunt_numero_h"      VARCHAR(50),
        "date_deces"           DATE NOT NULL,
        "lieu_deces"           VARCHAR(200) DEFAULT '',
        "cause_deces"          VARCHAR(200) DEFAULT '',
        "declarant_nom"        VARCHAR(100),
        "declarant_telephone"  VARCHAR(50),
        "statut"               VARCHAR(30) DEFAULT 'en_attente',
        "notes"                TEXT,
        "created_at"           TIMESTAMPTZ DEFAULT NOW(),
        "updated_at"           TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "mairie_agents" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "nom"         VARCHAR(100) NOT NULL,
        "prenom"      VARCHAR(100) NOT NULL,
        "role"        VARCHAR(50) DEFAULT 'Agent',
        "telephone"   VARCHAR(50),
        "email"       VARCHAR(255),
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "mairie_residences" (
        "id"               SERIAL PRIMARY KEY,
        "tenant_code"      VARCHAR(50) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "numero_dossier"   VARCHAR(50) UNIQUE NOT NULL,
        "nom"              VARCHAR(100) NOT NULL,
        "prenom"           VARCHAR(100) NOT NULL,
        "date_naissance"   DATE,
        "numero_h"         VARCHAR(50),
        "adresse"          VARCHAR(300) NOT NULL,
        "depuis_quand"     VARCHAR(100) DEFAULT '',
        "motif"            VARCHAR(100) DEFAULT 'Autre',
        "statut"           VARCHAR(30) DEFAULT 'en_attente',
        "notes"            TEXT,
        "chef_quartier_id"          INTEGER,
        "chef_quartier_nom"         VARCHAR(150),
        "chef_quartier_telephone"   VARCHAR(50),
        "chef_quartier_valide"      BOOLEAN DEFAULT FALSE,
        "chef_quartier_date"        TIMESTAMPTZ,
        "created_at"       TIMESTAMPTZ DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});
    // Ajouter les colonnes chef de quartier sur les bases existantes (migration douce)
    await sequelize.query(`ALTER TABLE mairie_residences ADD COLUMN IF NOT EXISTS chef_quartier_id INTEGER`).catch(() => {});
    await sequelize.query(`ALTER TABLE mairie_residences ADD COLUMN IF NOT EXISTS chef_quartier_nom VARCHAR(150)`).catch(() => {});
    await sequelize.query(`ALTER TABLE mairie_residences ADD COLUMN IF NOT EXISTS chef_quartier_telephone VARCHAR(50)`).catch(() => {});
    await sequelize.query(`ALTER TABLE mairie_residences ADD COLUMN IF NOT EXISTS chef_quartier_valide BOOLEAN DEFAULT FALSE`).catch(() => {});
    await sequelize.query(`ALTER TABLE mairie_residences ADD COLUMN IF NOT EXISTS chef_quartier_date TIMESTAMPTZ`).catch(() => {});
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "mairie_chefs_quartier" (
        "id"                    SERIAL PRIMARY KEY,
        "tenant_code"           VARCHAR(50) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "nom"                   VARCHAR(100) NOT NULL,
        "prenom"                VARCHAR(100) DEFAULT '',
        "quartier"              VARCHAR(150) NOT NULL,
        "telephone"             VARCHAR(50),
        "date_prise_fonction"   DATE,
        "is_active"             BOOLEAN DEFAULT TRUE,
        "created_at"            TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});
    console.log('✅ Tables mairie (état civil) prêtes');
  } catch (err) {
    console.warn('⚠️ initAllTables [gestion-interne]:', err.message);
  }

  // ── Transport & Livraison ───────────────────────────────────────────────────
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "transport_vehicles" (
        "id"             SERIAL PRIMARY KEY,
        "tenant_code"    VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "immatriculation" VARCHAR(50) NOT NULL,
        "type_vehicule"  VARCHAR(50) DEFAULT 'voiture',
        "marque"         VARCHAR(100),
        "capacite"       INTEGER DEFAULT 4,
        "driver_id"      INTEGER,
        "description"    TEXT,
        "statut"         VARCHAR(30) DEFAULT 'actif',
        "created_at"     TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "transport_drivers" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "nom"         VARCHAR(100) NOT NULL,
        "prenom"      VARCHAR(100),
        "telephone"   VARCHAR(50),
        "permis"      VARCHAR(50),
        "type_permis" VARCHAR(20),
        "salaire"     INTEGER DEFAULT 0,
        "notes"       TEXT,
        "statut"      VARCHAR(30) DEFAULT 'disponible',
        "created_at"  TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "transport_trips" (
        "id"              SERIAL PRIMARY KEY,
        "tenant_code"     VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "lieu_depart"     VARCHAR(200) NOT NULL,
        "lieu_arrivee"    VARCHAR(200) NOT NULL,
        "date_depart"     DATE NOT NULL,
        "heure_depart"    TIME,
        "prix"            INTEGER DEFAULT 0,
        "places_total"    INTEGER DEFAULT 4,
        "places_restantes" INTEGER DEFAULT 4,
        "driver_id"       INTEGER REFERENCES "transport_drivers"("id") ON DELETE SET NULL,
        "vehicle_id"      INTEGER REFERENCES "transport_vehicles"("id") ON DELETE SET NULL,
        "notes"           TEXT,
        "statut"          VARCHAR(30) DEFAULT 'prevu',
        "created_at"      TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "transport_bookings" (
        "id"               SERIAL PRIMARY KEY,
        "tenant_code"      VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "trip_id"          INTEGER REFERENCES "transport_trips"("id") ON DELETE SET NULL,
        "client_nom"       VARCHAR(200) NOT NULL,
        "client_telephone" VARCHAR(50),
        "places"           INTEGER DEFAULT 1,
        "montant"          INTEGER DEFAULT 0,
        "notes"            TEXT,
        "statut"           VARCHAR(30) DEFAULT 'en_attente',
        "created_at"       TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "transport_announcements" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "titre"       VARCHAR(200) NOT NULL,
        "contenu"     TEXT NOT NULL,
        "type"        VARCHAR(50) DEFAULT 'general',
        "created_at"  TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "transport_deliveries" (
        "id"               SERIAL PRIMARY KEY,
        "tenant_code"      VARCHAR(30) NOT NULL REFERENCES "management_tenants"("tenant_code") ON DELETE CASCADE,
        "client_nom"       VARCHAR(200) NOT NULL,
        "client_telephone" VARCHAR(50),
        "adresse_collecte" VARCHAR(300) NOT NULL,
        "adresse_livraison" VARCHAR(300) NOT NULL,
        "description"      TEXT,
        "poids"            NUMERIC(8,2) DEFAULT 0,
        "montant"          INTEGER DEFAULT 0,
        "driver_id"        INTEGER REFERENCES "transport_drivers"("id") ON DELETE SET NULL,
        "vehicle_id"       INTEGER REFERENCES "transport_vehicles"("id") ON DELETE SET NULL,
        "notes"            TEXT,
        "statut"           VARCHAR(30) DEFAULT 'en_attente',
        "created_at"       TIMESTAMP DEFAULT NOW()
      );
    `).catch(() => {});
    console.log('✅ Tables transport prêtes');
  } catch (err) {
    console.warn('⚠️ initAllTables [transport]:', err.message);
  }

  // ── Réseau des Imams ────────────────────────────────────────────────────────
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "imam_network_profiles" (
        "id"          SERIAL PRIMARY KEY,
        "numero_h"    VARCHAR(50) UNIQUE NOT NULL,
        "nom_mosquee" VARCHAR(255) NOT NULL,
        "adresse"     VARCHAR(255) DEFAULT '',
        "quartier"    VARCHAR(100) DEFAULT '',
        "ville"       VARCHAR(100) NOT NULL,
        "pays"        VARCHAR(100) NOT NULL,
        "bio"         TEXT DEFAULT '',
        "is_verified" BOOLEAN DEFAULT false,
        "is_active"   BOOLEAN DEFAULT true,
        "created_at"  TIMESTAMP DEFAULT NOW(),
        "updated_at"  TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "imam_connections" (
        "id"                   SERIAL PRIMARY KEY,
        "imam_numero_h"        VARCHAR(50) NOT NULL,
        "connected_numero_h"   VARCHAR(50) NOT NULL,
        "statut"               VARCHAR(20) DEFAULT 'pending',
        "created_at"           TIMESTAMP DEFAULT NOW(),
        UNIQUE("imam_numero_h", "connected_numero_h")
      );
      CREATE TABLE IF NOT EXISTS "imam_community_members" (
        "id"               SERIAL PRIMARY KEY,
        "imam_numero_h"    VARCHAR(50) NOT NULL,
        "fidele_numero_h"  VARCHAR(50),
        "fidele_nom"       VARCHAR(255) DEFAULT '',
        "fidele_telephone" VARCHAR(50)  DEFAULT '',
        "quartier"         VARCHAR(100) DEFAULT '',
        "is_active"        BOOLEAN DEFAULT true,
        "joined_at"        TIMESTAMP DEFAULT NOW(),
        UNIQUE("imam_numero_h", "fidele_numero_h")
      );
      CREATE TABLE IF NOT EXISTS "friday_announcements" (
        "id"                  SERIAL PRIMARY KEY,
        "imam_numero_h"       VARCHAR(50) NOT NULL,
        "sourate_numero"      INTEGER,
        "sourate_nom"         VARCHAR(100) DEFAULT '',
        "versets_debut"       INTEGER,
        "versets_fin"         INTEGER,
        "texte_arabe"         TEXT DEFAULT '',
        "traduction"          TEXT DEFAULT '',
        "message_imam"        TEXT NOT NULL,
        "date_vendredi"       DATE NOT NULL,
        "is_sent"             BOOLEAN DEFAULT false,
        "sent_at"             TIMESTAMP,
        "nb_fideles_notifies" INTEGER DEFAULT 0,
        "created_at"          TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "national_religious_coordinators" (
        "id"         SERIAL PRIMARY KEY,
        "numero_h"   VARCHAR(50) UNIQUE NOT NULL,
        "pays"       VARCHAR(100) NOT NULL,
        "titre"      VARCHAR(255) DEFAULT '',
        "is_active"  BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP DEFAULT NOW()
      );
    `).catch(() => {});
    console.log('✅ Tables réseau des imams prêtes');
  } catch (err) {
    console.warn('⚠️ initAllTables [imam-network]:', err.message);
  }

  // ── Réseau Professionnel Générique ──────────────────────────────────────────
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "pro_network_profiles" (
        "id"            SERIAL PRIMARY KEY,
        "numero_h"      VARCHAR(50)  NOT NULL,
        "pro_type"      VARCHAR(50)  NOT NULL,
        "nom_structure" VARCHAR(255) NOT NULL,
        "adresse"       VARCHAR(255) DEFAULT '',
        "quartier"      VARCHAR(100) DEFAULT '',
        "ville"         VARCHAR(100) NOT NULL,
        "pays"          VARCHAR(100) DEFAULT '',
        "bio"           TEXT         DEFAULT '',
        "is_active"     BOOLEAN      DEFAULT true,
        "created_at"    TIMESTAMP    DEFAULT NOW(),
        "updated_at"    TIMESTAMP    DEFAULT NOW(),
        UNIQUE("numero_h", "pro_type")
      );
      CREATE TABLE IF NOT EXISTS "pro_connections" (
        "id"              SERIAL PRIMARY KEY,
        "from_numero_h"   VARCHAR(50) NOT NULL,
        "to_numero_h"     VARCHAR(50) NOT NULL,
        "pro_type"        VARCHAR(50) NOT NULL,
        "statut"          VARCHAR(20) DEFAULT 'pending',
        "created_at"      TIMESTAMP   DEFAULT NOW(),
        UNIQUE("from_numero_h", "to_numero_h", "pro_type")
      );
      CREATE TABLE IF NOT EXISTS "pro_community_members" (
        "id"              SERIAL PRIMARY KEY,
        "pro_numero_h"    VARCHAR(50) NOT NULL,
        "member_numero_h" VARCHAR(50),
        "pro_type"        VARCHAR(50) NOT NULL,
        "nom_membre"      VARCHAR(255) DEFAULT '',
        "telephone"       VARCHAR(50)  DEFAULT '',
        "quartier"        VARCHAR(100) DEFAULT '',
        "is_active"       BOOLEAN      DEFAULT true,
        "joined_at"       TIMESTAMP    DEFAULT NOW(),
        UNIQUE("pro_numero_h", "member_numero_h", "pro_type")
      );
      CREATE TABLE IF NOT EXISTS "pro_announcements" (
        "id"           SERIAL PRIMARY KEY,
        "pro_numero_h" VARCHAR(50)  NOT NULL,
        "pro_type"     VARCHAR(50)  NOT NULL,
        "titre"        VARCHAR(255) DEFAULT '',
        "contenu"      TEXT         NOT NULL,
        "date_annonce" DATE         NOT NULL,
        "is_sent"      BOOLEAN      DEFAULT false,
        "sent_at"      TIMESTAMP,
        "nb_notifies"  INTEGER      DEFAULT 0,
        "created_at"   TIMESTAMP    DEFAULT NOW()
      );
    `).catch(() => {});
    console.log('✅ Tables réseau professionnel générique prêtes');
  } catch (err) {
    console.warn('⚠️ initAllTables [pro-network]:', err.message);
  }

  // ── Seed des tenants DEMO (vitrines + gestion admin) ───────────────────────
  try {
    const DEMO_TENANTS = [
      { code: 'DEMO-REF-CLIN',  type: 'clinic',          name: 'Clinique Référence Admin' },
      { code: 'DEMO-REF-ECO',   type: 'school',          name: 'École Référence Admin' },
      { code: 'DEMO-REF-MSQ',   type: 'mosque',          name: 'Réseau Imam Référence Admin' },
      { code: 'DEMO-REF-RESEAU',type: 'reseau',          name: 'Réseau Référence Admin' },
      { code: 'DEMO-REF-MDS',   type: 'madrasa',         name: 'Madrasa Référence Admin' },
      { code: 'DEMO-REF-COM',   type: 'commerce',        name: 'Boutique Référence Admin' },
      { code: 'DEMO-REF-ENT',   type: 'enterprise',      name: 'Entreprise Référence Admin' },
      { code: 'DEMO-REF-NGO',   type: 'ngo',             name: 'ONG Référence Admin' },
      { code: 'DEMO-REF-JOUR',  type: 'journalist',      name: 'Média Référence Admin' },
      { code: 'DEMO-REF-SCIEN', type: 'scientist',       name: 'Science Référence Admin' },
      { code: 'DEMO-REF-FOUR',  type: 'supplier',        name: 'Fournisseur Référence Admin' },
      { code: 'DEMO-REF-SECU',  type: 'security_agency', name: 'Sécurité Référence Admin' },
      { code: 'DEMO-REF-IMMO',  type: 'immobilier',      name: 'Immobilier Référence Admin' },
      { code: 'DEMO-REF-RESTO', type: 'restaurant',      name: 'Restaurant Référence Admin' },
      { code: 'DEMO-REF-TRANS', type: 'transport',       name: 'Transport Référence Admin' },
      { code: 'DEMO-REF-MAIR',  type: 'mairie',          name: 'Mairie Référence Admin' },
    ];
    for (const t of DEMO_TENANTS) {
      await sequelize.query(
        `INSERT INTO management_tenants (tenant_code, type, name, owner_numero_h, is_active)
         VALUES (:code, :type, :name, 'G7C7P7R7E7F7 7', true)
         ON CONFLICT (tenant_code) DO NOTHING`,
        { replacements: { code: t.code, type: t.type, name: t.name } }
      ).catch(() => {});
    }
    console.log('✅ Tenants DEMO seedés dans management_tenants');
  } catch (err) {
    console.warn('⚠️ initAllTables [demo-seed]:', err.message);
  }
}

// Démarrage : tout pointe sur enfants_adam_eve — une seule base, 5 instances Sequelize
// (main, pro, IA, temps, diangou) → toutes synchronisées sur la même DB.
connectDB()
  .then(() => initAllTables())
  .then(() => ensureAdmin())
  .then(() => {
    return Promise.all([
      connectDB_Pro().catch(e => console.error('⚠️  Modèles [pro] non disponibles:', e.message)),
      connectDB_IA().catch(e => console.error('⚠️  Modèles [IA] non disponibles:', e.message)),
      connectDB_Temps().catch(e => console.error('⚠️  Modèles [temps] non disponibles:', e.message)),
      connectDB_Diangou().catch(e => console.error('⚠️  Modèles [diangou] non disponibles:', e.message))
    ]);
  })
  .then(() => {
    console.log('✅ Tous les modèles synchronisés sur enfants_adam_eve');
    initSocket(httpServer, rawOrigins);
    httpServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        process.exit(0);
      } else {
        console.error('❌ Erreur serveur:', err.message);
        process.exit(1);
      }
    });

    httpServer.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`📁 Dossier uploads: ${path.join(__dirname, '../uploads')}`);
      console.log(`🔌 Socket.io activé (WebRTC signaling + temps réel)`);
      startIaServer();
      startSubscriptionChecker();
      startMessageCleanup();
    });

    // Écouter aussi sur 5002 pour compatibilité avec les anciens clients
    if (String(PORT) !== '5002') {
      const alias = http.createServer(app);
      alias.on('error', () => {});
      alias.listen(5002, () => console.log(`🔗 Alias port 5002 actif`));
    }
  })
  .catch((error) => {
    console.error('❌ Impossible de démarrer sans base de données.');
    console.error('   ', error?.message || error);
    process.exit(1);
  });

// Compression GZIP — réduit la taille des réponses de 70-90%
app.use(compression({ level: 6 }));

// Middleware de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:", "http://localhost:7777", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "data:", "blob:"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
}));

// Configuration CORS
// En prod : CORS_ORIGIN = URL Cloudflare Pages (ex: https://enfants-adam.pages.dev)
// Plusieurs origines séparées par une virgule sont supportées.
const rawOrigins = [
  config.FRONTEND_URL,
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : []),
  'https://moftal.com',
  'https://www.moftal.com',
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // appels server-to-server, Postman
    // Dev : tout accepter
    if (process.env.NODE_ENV === 'development') return callback(null, true);
    // Prod : accepter les origines configurées + Cloudflare Pages (*.pages.dev) + *.moftal.com
    if (rawOrigins.includes(origin)) return callback(null, true);
    if (/^https:\/\/[a-z0-9-]+\.pages\.dev$/.test(origin)) return callback(null, true);
    if (/^https:\/\/([a-z0-9-]+\.)?moftal\.com$/.test(origin)) return callback(null, true);
    return callback(new Error(`CORS: origine non autorisée — ${origin}`));
  },
  credentials: true
}));

// Rate limiting
const isDev = process.env.NODE_ENV === 'development';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 10000 : 500, // en dev: illimité pour tests, en prod: 500 par 15min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard'
  }
});

// On applique le rate limit uniquement sur les routes API,
// pas sur les fichiers statiques /uploads
app.use('/api', limiter);

// Middleware pour parser le JSON
// Limite élevée pour enregistrement vivant (photo + vidéo en base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir les fichiers uploads (photos, vidéos)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d', // cache navigateur 7 jours pour les images
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/logos', logoRoutes);
app.use('/api/page-admins', pageAdminRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/residences', residenceRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/faith', faithRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/exchange', exchangeRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/defi-educatif', defiEducatifRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/family-tree', familyTreeRoutes);
app.use('/api/parent-child', parentChildRoutes);
app.use('/api/couple', coupleRoutes);
app.use('/api/family-core', familyCoreRoutes);
app.use('/api/science', scienceRoutes);
app.use('/api/reality', realityRoutes);
app.use('/api/state-messages', stateMessagesRoutes);
app.use('/api/state-products', stateProductsRoutes);
app.use('/api/user-stories', userStoriesRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/pro-members',   proMembersRoutes);
app.use('/api/clinic-mgmt',   clinicMgmtRoutes);
app.use('/api/mairie-mgmt',   mairieMgmtRoutes);
app.use('/api/mairie-public', mairePublicRoutes);
app.use('/api/clinic-public',    clinicPublicRoutes);
app.use('/api/commerce-public', commercePublicRoutes);
app.use('/api/pro-public',      proPublicRoutes);
app.use('/api/school-mgmt',   schoolMgmtRoutes);
app.use('/api/mosque-mgmt',   mosqueMgmtRoutes);
app.use('/api/madrasa-mgmt',  madrasaMgmtRoutes);
app.use('/api/imam-mgmt',     imamMgmtRoutes);
app.use('/api/ngo-mgmt',          ngoMgmtRoutes);
app.use('/api/journalist-mgmt',   journalistMgmtRoutes);
app.use('/api/commerce-mgmt',    commerceMgmtRoutes);
app.use('/api/enterprise-mgmt', enterpriseMgmtRoutes);
app.use('/api/scientist-mgmt',  scientistMgmtRoutes);
app.use('/api/supplier-mgmt',  supplierMgmtRoutes);
app.use('/api/security-mgmt',  securityMgmtRoutes);
app.use('/api/retailer-mgmt',  retailerMgmtRoutes);
app.use('/api/beauty-mgmt',    beautyMgmtRoutes);
app.use('/api/artisan-mgmt',   artisanMgmtRoutes);
app.use('/api/producer-mgmt',  producerMgmtRoutes);
app.use('/api/reseau-mgmt',      reseauMgmtRoutes);
app.use('/api/immo-mgmt',        immoMgmtRoutes);
app.use('/api/restaurant-mgmt',  restaurantMgmtRoutes);
app.use('/api/transport-mgmt',   transportMgmtRoutes);
app.use('/api/imam-network',     imamNetworkRoutes);
app.use('/api/pro-network',   proNetworkRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/admin/moderation', moderationRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/quotas', quotasRoutes);
app.use('/api/family-fund', familyFundRoutes);
app.use('/api/withdrawal-requests', withdrawalRequestsRoutes);
app.use('/api/djomy', djomyPaymentRoutes);
app.use('/api/moftal-pay', moftalPayRoutes);
app.use('/api/racines', racinesRoutes);
app.use('/api/zakat', zakatRoutes);
app.use('/api/formations', formationsRoutes);
app.use('/api/developpement', developpementRoutes);
app.use('/api', additionalRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Serveur fonctionnel',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route pour servir les fichiers uploadés
app.get('/api/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads', filename);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({
        success: false,
        message: 'Fichier non trouvé'
      });
    }
  });
});

// Middleware pour gérer les erreurs d'upload (multer) - DOIT être APRÈS les routes
app.use(handleUploadError);

// Middleware de gestion des erreurs générales
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur serveur interne',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Middleware qui sert les fichiers pré-compressés (.br / .gz) générés par Vite
// Bien plus rapide que la compression dynamique (le travail est déjà fait au build)
function servePrecompressed(assetsDir) {
  const typeMap = {
    '.js':   'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg':  'image/svg+xml; charset=utf-8',
  };
  return (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    const contentType = typeMap[ext];
    if (!contentType) return next();

    const acceptEncoding = req.headers['accept-encoding'] || '';
    const candidates = [];
    if (acceptEncoding.includes('br'))   candidates.push({ enc: 'br',   suffix: '.br'  });
    if (acceptEncoding.includes('gzip')) candidates.push({ enc: 'gzip', suffix: '.gz'  });

    for (const { enc, suffix } of candidates) {
      const compressed = path.join(assetsDir, req.path.replace(/^\//, '') + suffix);
      if (fs.existsSync(compressed)) {
        res.setHeader('Content-Encoding', enc);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Vary', 'Accept-Encoding');
        return res.sendFile(compressed);
      }
    }
    next();
  };
}

// Servir le frontend React (build Vite) — uniquement si le dossier dist existe
// (sur Render le frontend n'est pas buildé ici, il est hébergé séparément sur Cloudflare Pages)
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  const assetsDir = path.join(frontendDist, 'assets');

  // 1. Servir d'abord les fichiers pré-compressés (brotli > gzip > non-compressé)
  app.use('/assets', servePrecompressed(assetsDir));

  // 2. Fallback : servir le fichier non-compressé avec cache long
  app.use('/assets', express.static(assetsDir, {
    maxAge: '1y',
    immutable: true,
  }));

  // 3. Fichiers racine (logo, robots.txt…) : cache court
  app.use(express.static(frontendDist, { maxAge: '1h' }));

  // 4. SPA : toutes les routes renvoient index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: 'Route non trouvée' });
  });
}

// Démarrage du serveur : fait dans connectDB().then() plus haut (serveur ne démarre que si la base est connectée)

export default app;
