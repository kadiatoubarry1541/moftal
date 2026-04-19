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
import scienceRoutes from './routes/science.js';
import realityRoutes from './routes/reality.js';
import stateMessagesRoutes from './routes/stateMessages.js';
import stateProductsRoutes from './routes/stateProducts.js';
import userStoriesRoutes from './routes/userStories.js';
import professionalRoutes from './routes/professionals.js';
import appointmentRoutes from './routes/appointments.js';
import notificationRoutes from './routes/notifications.js';
import iaRoutes from './routes/ia.js';
import moderationRoutes from './routes/moderation.js';
import paymentRoutes from './routes/payment.js';
import Payment from './models/Payment.js';
import { handleUploadError } from './middleware/upload.js';
import { config } from '../config.js';
import User from './models/User.js';
import bcrypt from 'bcryptjs';
import { startSubscriptionChecker } from './services/subscriptionChecker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration dotenv
dotenv.config({ path: path.join(path.dirname(__dirname), 'config.env') });

const app = express();
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
  const pythonCmds = process.platform === 'win32' ? ['py', 'python'] : ['python3', 'python'];

  const trySpawn = (index) => {
    if (index >= pythonCmds.length) {
      console.error('❌ Impossible de démarrer automatiquement le Professeur IA (Python introuvable).');
      console.error('   Vérifiez que Python est installé, puis démarrez IA SC/app.py manuellement si nécessaire.');
      return;
    }

    const cmd = pythonCmds[index];
    console.log(`🔄 Tentative de démarrage du Professeur IA avec "${cmd}"...`);

    try {
      iaProcess = spawn(cmd, ['app.py'], {
        cwd: iaDir,
        stdio: 'inherit',
        shell: process.platform === 'win32'
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

// Créer ou mettre à jour le compte admin au démarrage (pour Render / production)
async function ensureAdmin() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return;
  const adminNumeroH = (process.env.ADMIN_NUMERO_H || 'G0C0P0R0E0F0 0').trim().replace(/\s+/g, ' ');
  try {
    let admin = await User.findByNumeroH(adminNumeroH);
    const saltRounds = config.BCRYPT_ROUNDS || 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    if (admin) {
      const valid = await bcrypt.compare(adminPassword, admin.password);
      if (!valid) {
        await admin.update({ password: hashedPassword, role: 'super-admin', isActive: true });
        console.log('✅ Compte admin mis à jour (mot de passe synchronisé avec ADMIN_PASSWORD)');
      }
    } else {
      admin = await User.create({
        numeroH: adminNumeroH,
        prenom: 'Administrateur',
        nomFamille: 'Principal',
        password: hashedPassword,
        role: 'super-admin',
        isActive: true,
        isVerified: true,
        type: 'vivant',
        genre: 'AUTRE',
        generation: 'G0'
      });
      console.log('✅ Compte admin créé (NumeroH:', adminNumeroH, ')');
    }
  } catch (e) {
    console.warn('⚠️ ensureAdmin:', e.message);
  }
}

// Crée toutes les tables supplémentaires (galerie, activités couple/parent-enfant)
// en production sur Render où sequelize.sync({ alter }) n'est pas exécuté
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
    }
  ];

  for (const table of tables) {
    try {
      await sequelize.query(table.sql);
      for (const idx of table.indexes) await sequelize.query(idx).catch(() => {});
      for (const alt of table.alters) await sequelize.query(alt).catch(() => {});
      console.log(`✅ Table prête : ${table.name}`);
    } catch (err) {
      console.warn(`⚠️ initAllTables [${table.name}]:`, err.message);
    }
  }

  // Colonne audio sur exchange_products (photo + audio 30s)
  try {
    await sequelize.query(`ALTER TABLE "exchange_products" ADD COLUMN IF NOT EXISTS "audio" JSONB DEFAULT '[]';`).catch(() => {});
  } catch (_) {}

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
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`📁 Dossier uploads: ${path.join(__dirname, '../uploads')}`);
      startIaServer();
      startSubscriptionChecker();
    });
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
  contentSecurityPolicy: false, // désactivé car React gère ses propres scripts
}));

// Configuration CORS (autorise plusieurs origines localhost + production)
const allowedOrigins = [
  config.FRONTEND_URL,
  process.env.CORS_ORIGIN, // URL de production depuis les variables d'environnement
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:5179',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:5177',
  'http://127.0.0.1:5178',
  'http://127.0.0.1:5179'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // En développement : accepter localhost et 127.0.0.1 sur n'importe quel port
    if (process.env.NODE_ENV === 'development') {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // En dev, accepter tout pour faciliter les tests
    }
    // En production
    if (!process.env.CORS_ORIGIN) return callback(null, true);
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, true);
  },
  credentials: true
}));

// Rate limiting
// ⚠️ En développement, on assouplit fortement la limite pour éviter
// de bloquer les tests (changement de photo de profil, reload, etc.)
const isDev = process.env.NODE_ENV === 'development';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 10000 : 100, // en dev: 10 000 requêtes, en prod: 100
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
app.use('/api/science', scienceRoutes);
app.use('/api/reality', realityRoutes);
app.use('/api/state-messages', stateMessagesRoutes);
app.use('/api/state-products', stateProductsRoutes);
app.use('/api/user-stories', userStoriesRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/admin/moderation', moderationRoutes);
app.use('/api/payment', paymentRoutes);
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

// Servir le frontend React (build Vite) — en production ET en mode preview local
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (process.env.NODE_ENV === 'production' || fs.existsSync(frontendDist)) {
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
