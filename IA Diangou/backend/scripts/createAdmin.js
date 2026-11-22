import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

async function createAdmin() {
  try {
    console.log('🔄 Connexion à la base de données...');
    
    // Connexion à la base de données
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie');

    // Synchroniser les modèles
    await sequelize.sync({ alter: true });
    console.log('✅ Modèles synchronisés');

    const adminEmail = 'kadiatou1541.kb@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || '';
if (!adminPassword) { console.error('❌ Mot de passe absent : lancez le script avec ADMIN_PASSWORD=… (jamais écrit dans le code).'); process.exit(1); }
    const adminNomComplet = 'Admin Diangou';

    console.log(`\n🔍 Recherche de l'utilisateur avec l'email: ${adminEmail}...`);

    // Vérifier si l'admin existe déjà
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    
    if (existingAdmin) {
      console.log('📝 Utilisateur trouvé, mise à jour en cours...');
      // Mettre à jour le rôle si l'utilisateur existe
      existingAdmin.role = 'admin';
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      existingAdmin.password = hashedPassword;
      await existingAdmin.save();
      console.log('\n✅ Compte admin mis à jour avec succès !');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Mot de passe: (celui de ADMIN_PASSWORD)`);
      console.log(`👤 NumeroH: ${existingAdmin.numeroH}`);
      console.log(`🎭 Rôle: ${existingAdmin.role}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.log('➕ Création d\'un nouveau compte admin...');
      // Créer un nouveau compte admin
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      const [prenom, ...nomParts] = adminNomComplet.split(' ');
      const nomFamille = nomParts.join(' ') || prenom;

      // Générer un NumeroH unique pour l'admin
      let numeroH = 'ADMIN001';
      let exists = true;
      let counter = 1;
      
      while (exists) {
        const existing = await User.findOne({ where: { numeroH } });
        if (!existing) {
          exists = false;
        } else {
          counter++;
          numeroH = `ADMIN${counter.toString().padStart(3, '0')}`;
        }
      }

      const admin = await User.create({
        numeroH,
        password: hashedPassword,
        prenom: prenom || adminNomComplet,
        nomFamille,
        email: adminEmail,
        role: 'admin',
        isActive: true,
        metadata: {
          isAdmin: true,
          createdAt: new Date().toISOString()
        }
      });

      console.log('\n✅ Compte admin créé avec succès !');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Mot de passe: (celui de ADMIN_PASSWORD)`);
      console.log(`👤 NumeroH: ${admin.numeroH}`);
      console.log(`🎭 Rôle: ${admin.role}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    await sequelize.close();
    console.log('\n✅ Connexion fermée');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de la création de l\'admin:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

createAdmin();

