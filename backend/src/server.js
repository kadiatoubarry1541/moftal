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
import siblingRoutes from './routes/sibling.js';
import coupleRoutes from './routes/couple.js';
import unreadRoutes from './routes/unread.js';
import familyCoreRoutes from './routes/familyCore.js';
import scienceRoutes from './routes/science.js';
import realityRoutes from './routes/reality.js';
import stateMessagesRoutes from './routes/stateMessages.js';
import stateProductsRoutes from './routes/stateProducts.js';
import userStoriesRoutes from './routes/userStories.js';
import professionalRoutes from './routes/professionals.js';
import invitationsProRoutes from './routes/invitationsPro.js';
import proVitrineRoutes from './routes/pro-vitrine.js';
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
import juridiqueMgmtRoutes from './routes/juridique-management.js';
import artisanMgmtRoutes   from './routes/artisan-management.js';
import producerMgmtRoutes  from './routes/producer-management.js';
import reseauMgmtRoutes      from './routes/reseau-management.js';
import immoMgmtRoutes        from './routes/immo-management.js';
import restaurantMgmtRoutes  from './routes/restaurant-management.js';
import { publicDemandesRouter, siteMgmtRouter } from './routes/siteDemandes.js';
import transportMgmtRoutes  from './routes/transport-management.js';
import imamNetworkRoutes from './routes/imam-network.js';
import proNetworkRoutes from './routes/professional-network.js';
import appointmentRoutes from './routes/appointments.js';
import notificationRoutes from './routes/notifications.js';
import iaRoutes from './routes/ia.js';
import moderationRoutes from './routes/moderation.js';
import paymentRoutes from './routes/payment.js';
import uploadRoutes from './routes/upload.js';
import fichiersRoutes from './routes/fichiers.js';
import codeOuvertureRoutes from './routes/codeOuverture.js';
import { cleLimite, validationLimite, adresseVisiteur } from './utils/cleLimite.js';
import { migrerPhotosDisque, deplacerFichiersHorsBase } from './services/fichiersBase.js';
import { erreursDonnees } from './middleware/erreursDonnees.js';
import { idempotence } from './middleware/idempotence.js';
import { echecsSynchro } from './middleware/echecsSynchro.js';
import quotasRoutes from './routes/quotas.js';
import nouveautesRoutes from './routes/nouveautes.js';
import responsablesRoutes from './routes/responsables.js';
import infoCardsRoutes from './routes/infoCards.js';
import familyFundRoutes from './routes/familyFund.js';
import quartierFundRoutes from './routes/quartierFund.js';
import familyDataRoutes from './routes/familyData.js';
import quartierDocumentsRoutes from './routes/quartierDocuments.js';
import residenceProofsRoutes from './routes/residenceProofs.js';
import locationChildrenRoutes from './routes/locationChildren.js';
import withdrawalRequestsRoutes from './routes/withdrawalRequests.js';
import djomyPaymentRoutes from './routes/djomyPayment.js';
import moftalPayRoutes from './routes/MoftalPay.js';
import pushRoutes from './routes/push.js';
import racinesRoutes from './routes/racines.js';
import zakatRoutes from './routes/zakat.js';
import formationsRoutes from './routes/formations.js';
import developpementRoutes from './routes/developpement.js';
import publicitesRoutes from './routes/publicites.js';
import verificationRoutes from './routes/verification.js';
import governmentsRoutes from './routes/governments.js';
import Payment from './models/Payment.js';
import { handleUploadError } from './middleware/upload.js';
import { config } from '../config.js';
import User from './models/User.js';
import { startSubscriptionChecker } from './services/subscriptionChecker.js';
import { startMessageCleanup } from './services/messageCleanup.js';
import { ensureAdmin, initAllTables, creerTablesManquantesSecondaires } from './db/miseAJourBase.js';

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

// Filet de sécurité : une promesse rejetée oubliée est journalisée au lieu
// d'arrêter tout le serveur (Node 22 s'arrête sinon).
process.on('unhandledRejection', (raison) => {
  console.error('🚨 Promesse rejetée non gérée :', raison?.stack || raison);
});

connectDB()
  .then(() => creerTablesManquantesSecondaires())
  .then(() => initAllTables())
  .then(() => ensureAdmin())
  // Produits déjà présents dans les gestions des commerçants → visibles dans Échange
  .then(() => import('./services/syncEchange.js').then((m) => { m.synchroniserTout(); }))
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
      connectSrc: ["'self'", "wss:", "ws:", "https://api.moftal.com", "https://moftal.com", "https://gestion.moftal.com", "https://gestions.moftal.com", "http://localhost:5002", "http://localhost:7777", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
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
  'https://gestion.moftal.com',
  'https://gestions.moftal.com',
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
  // Par membre (ou par visiteur réel), jamais une seule limite pour tout le site
  keyGenerator: cleLimite,
  validate: validationLimite,
  max: isDev ? 10000 : 500, // en dev: illimité pour tests, en prod: 500 par 15min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard'
  }
});

// Photos enregistrées en base : servies avant la limite de requêtes
// (une page en affiche beaucoup ; le navigateur les garde en cache)
app.use('/api/fichiers', fichiersRoutes);
setTimeout(() => {
  migrerPhotosDisque(path.join(__dirname, '../uploads')).catch((e) => console.warn('Migration photos:', e.message));
}, 15000);
// Photos et documents encore stockés DANS la base → stockage en ligne (libère Neon).
// Désactivable avec DEPLACER_FICHIERS_HORS_BASE=non.
if (process.env.DEPLACER_FICHIERS_HORS_BASE !== 'non') {
  setTimeout(() => {
    deplacerFichiersHorsBase().catch((e) => console.warn('Déplacement des fichiers hors base:', e.message));
  }, 60000);
}

// On applique le rate limit uniquement sur les routes API,
// pas sur les fichiers statiques /uploads
app.use('/api', limiter);

// Middleware pour parser le JSON
// Limite élevée pour enregistrement vivant (photo + vidéo en base64)
// rawBody : texte exact reçu, nécessaire pour vérifier la signature des
// notifications de paiement Djomy (le JSON re-sérialisé peut différer).
// 200 Mo seulement pour une personne connectée (photos / vidéos en base64) et
// pour l'inscription avec vidéo ; 5 Mo pour toute autre requête anonyme (sinon
// n'importe qui pouvait envoyer 200 Mo à n'importe quelle route publique).
const verifierCorps = (req, _res, buf) => { if (req.originalUrl?.startsWith('/api/djomy/webhook')) req.rawBody = buf.toString('utf8'); };
const jsonGrand = express.json({ limit: '200mb', verify: verifierCorps });
const jsonPetit = express.json({ limit: '5mb', verify: verifierCorps });
const formGrand = express.urlencoded({ extended: true, limit: '200mb' });
const formPetit = express.urlencoded({ extended: true, limit: '5mb' });
const corpsGrandPermis = (req) => String(req.headers.authorization || '').startsWith('Bearer ')
  || /^\/api\/auth\/register(\/|$|\?)/.test(req.originalUrl || '');
app.use((req, res, next) => (corpsGrandPermis(req) ? jsonGrand : jsonPetit)(req, res, next));
app.use((req, res, next) => (corpsGrandPermis(req) ? formGrand : formPetit)(req, res, next));

// Envois rejoués par le mode hors ligne : un même envoi (X-Idempotency-Key)
// n'est enregistré qu'une seule fois, même s'il arrive plusieurs fois
// Envoi hors ligne refusé : enregistré et signalé (personne, responsable, admins).
// Placé avant erreursDonnees pour lire le statut et le message déjà corrigés.
app.use('/api', echecsSynchro);
app.use('/api', erreursDonnees);
app.use('/api', idempotence);

// Servir les fichiers uploads (photos, vidéos)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d', // cache navigateur 7 jours pour les images
  // Un fichier envoyé ne peut jamais exécuter de script sur le domaine Moftal
  setHeaders: (res) => {
    res.setHeader('Content-Security-Policy', 'sandbox');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

// Routes
// Connexion : 10 essais ratés au plus par compte visé en 15 min. Compté par
// identifiant (NuméroH / téléphone / email) et non par adresse, qu'on peut
// falsifier : impossible d'essayer des milliers de mots de passe sur un compte.
const limiteurConnexion = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const ident = String(req.body?.numeroH || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return ident ? `connexion:${ident}` : `connexion-ip:${adresseVisiteur(req)}`;
  },
  validate: validationLimite,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop d\'essais de connexion pour ce compte. Réessayez dans 15 minutes, ou utilisez « Mot de passe oublié ».' }
});
app.post('/api/auth/login', limiteurConnexion);
app.use('/api/auth', authRoutes);
// Badges : gérés depuis l'espace admin (/api/admin/badges), réservés aux admins
app.use('/api/admin/badges', badgeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/badges', badgeRoutes);
// Adresse utilisée par la gestion des badges de l'admin (BadgeManager)
app.use('/api/admin/badges', badgeRoutes);
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
app.use('/api/sibling', siblingRoutes);
app.use('/api/couple', coupleRoutes);
app.use('/api/unread', unreadRoutes); // messages non lus du bouton 💬
app.use('/api/nouveautes', nouveautesRoutes); // pastilles « nouveautés » des rubriques
app.use('/api/responsables', responsablesRoutes); // chefs de quartier, maires… validés par l'admin
app.use('/api/family-core', familyCoreRoutes);
app.use('/api/science', scienceRoutes);
app.use('/api/reality', realityRoutes);
app.use('/api/state-messages', stateMessagesRoutes);
app.use('/api/state-products', stateProductsRoutes);
app.use('/api/user-stories', userStoriesRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/invitations-pro', invitationsProRoutes);
app.use('/api/pro-vitrine',   proVitrineRoutes);
app.use('/api/pro-members',   proMembersRoutes);
app.use('/api/clinic-mgmt',   clinicMgmtRoutes);
app.use('/api/mairie-mgmt',   mairieMgmtRoutes);
app.use('/api/mairie-public', mairePublicRoutes);
app.use('/api/clinic-public',    clinicPublicRoutes);
app.use('/api/commerce-public', commercePublicRoutes);
app.use('/api/pro-public',      publicDemandesRouter);
app.use('/api/pro-public',      proPublicRoutes);
app.use('/api/site-mgmt',       siteMgmtRouter);
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
app.use('/api/juridique-mgmt', juridiqueMgmtRoutes);
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
app.use('/api/code-ouverture', codeOuvertureRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/quotas', quotasRoutes);
app.use('/api/info-cards', infoCardsRoutes);
app.use('/api/family-fund', familyFundRoutes);
app.use('/api/quartier-fund', quartierFundRoutes);
app.use('/api/quartier-documents', quartierDocumentsRoutes);
app.use('/api/family-data', familyDataRoutes);
app.use('/api/residence-proofs', residenceProofsRoutes);
app.use('/api/location-children', locationChildrenRoutes);
app.use('/api/withdrawal-requests', withdrawalRequestsRoutes);
app.use('/api/djomy', djomyPaymentRoutes);
app.use('/api/moftal-pay', moftalPayRoutes);
app.use('/api/racines', racinesRoutes);
app.use('/api/zakat', zakatRoutes);
app.use('/api/formations', formationsRoutes);
app.use('/api/developpement', developpementRoutes);
app.use('/api/publicites', publicitesRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/governments', governmentsRoutes);
app.use('/api', additionalRoutes);

// Route de test
app.get('/api/health', async (req, res) => {
  // On ne force plus de requête vers la base ici : sur le plan gratuit Neon,
  // ça empêchait la base de se mettre en veille (elle restait active 24h/24)
  // et ça épuisait le quota d'heures de calcul mensuel en quelques jours.
  // La base se réveille naturellement sur une vraie requête utilisateur.
  const dbConnected = sequelize.connectionManager.pool
    ? sequelize.connectionManager.pool.size > 0
    : false;
  res.json({
    success: true,
    message: 'Serveur fonctionnel',
    dbConnected,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route pour servir les fichiers uploadés
// Seulement un nom de fichier du dossier uploads : jamais de « ../ » (sinon
// n'importe quel fichier du serveur, code et secrets compris, était lisible).
app.get('/api/files/:filename', (req, res) => {
  const filename = path.basename(String(req.params.filename || ''));
  if (!filename || filename.startsWith('.')) {
    return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
  }
  res.sendFile(filename, { root: path.join(__dirname, '../uploads'), dotfiles: 'deny' }, (err) => {
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
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  const assetsDir = path.join(frontendDist, 'assets');
  const indexHtml = fs.readFileSync(path.join(frontendDist, 'index.html'), 'utf-8');

  // 1. Servir d'abord les fichiers pré-compressés (brotli > gzip > non-compressé)
  app.use('/assets', servePrecompressed(assetsDir));

  // 2. Fallback : servir le fichier non-compressé avec cache long
  app.use('/assets', express.static(assetsDir, {
    maxAge: '1y',
    immutable: true,
  }));

  // 3a. Liens Android (Play Store) : /.well-known/assetlinks.json prouve à Google
  //     que l'application Moftal du Play Store appartient bien à moftal.com.
  //     express.static ignore les dossiers commençant par « . » : on l'autorise ici.
  app.use('/.well-known', express.static(path.join(frontendDist, '.well-known'), {
    dotfiles: 'allow',
    maxAge: '1h',
  }));

  // 3. Fichiers racine (logo, robots.txt…) : cache court
  app.use(express.static(frontendDist, { maxAge: '1h' }));

  // 4. SPA — injection du bon manifest PWA dès le HTML pour les espaces de gestion.
  //    Chrome lit le manifest AVANT que JavaScript s'exécute.
  //    En servant le bon manifest dans le HTML, beforeinstallprompt se déclenche
  //    avec la bonne identité → installation directe en 1 clic sans aucune question.

  // EspacePro (/espace-pro/:id) — manifest par ID de compte professionnel
  // Adresse du manifest IDENTIQUE à celle que la page remet ensuite
  // (frontend/src/main.tsx) : deux adresses pour la même app faisaient que le
  // téléphone ne la reconnaissait pas comme déjà installée.
  const originePage = (req) => {
    const proto = String(req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
    return encodeURIComponent(`${proto}://${req.get('host')}`);
  };

  app.get('/espace-pro/:id', (req, res) => {
    const proId = req.params.id;
    const html = indexHtml.replace(
      /<link rel="manifest"[^>]*>/,
      () => `<link rel="manifest" href="/api/professionals/pro-manifest/${encodeURIComponent(proId)}?origin=${originePage(req)}">`
    );
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    res.send(html);
  });

  // Pages gestion (/gestion-clinique/:code, /gestion-ecole/:code, etc.) — manifest par tenantCode
  // Couvre tous les types : clinique, école, mosquée, mairie, transport, restaurant…
  app.get(/^\/gestion-[^/]+\/([^/?]+)/, (req, res) => {
    // Code de l'établissement pris dans l'adresse : toujours encodé avant d'être
    // mis dans la page (sinon une adresse piégée y injectait un script).
    const tenantCode = encodeURIComponent(req.params[0]);
    // Racine de la gestion seulement (comme main.tsx) : une seule app par établissement
    const startUrl = encodeURIComponent(req.path.match(/^\/gestion-[^/]+\/[^/?]+/)[0]);
    const html = indexHtml.replace(
      /<link rel="manifest"[^>]*>/,
      () => `<link rel="manifest" href="/api/professionals/pro-manifest/by-tenant/${tenantCode}?startUrl=${startUrl}&origin=${originePage(req)}">`
    );
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    res.send(html);
  });

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
