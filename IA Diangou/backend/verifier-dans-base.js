// Script pour vérifier directement dans la base de données
import { sequelize } from './config/database.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'config.env') });

const email = 'kadiatou1541.kb@gmail.com';
const password = process.env.ADMIN_PASSWORD || '';
if (!password) { console.error('❌ Mot de passe absent : lancez le script avec ADMIN_PASSWORD=… (jamais écrit dans le code).'); process.exit(1); }

console.log('═══════════════════════════════════════════════════════════════');
console.log('  VÉRIFICATION DIRECTE DANS LA BASE DE DONNÉES');
console.log('═══════════════════════════════════════════════════════════════\n');

async function verifierDansBase() {
  try {
    // 1. Connexion
    console.log('1️⃣ Connexion à PostgreSQL...');
    await sequelize.authenticate();
    console.log('   ✅ Connexion réussie\n');

    // 2. Lister tous les utilisateurs
    console.log('2️⃣ Liste de tous les utilisateurs dans la base de données:');
    const allUsers = await User.findAll({
      attributes: ['numeroH', 'email', 'prenom', 'nomFamille', 'role', 'isActive', 'createdAt']
    });
    
    if (allUsers.length === 0) {
      console.log('   ⚠️ AUCUN UTILISATEUR TROUVÉ dans la base de données\n');
    } else {
      console.log(`   📊 Nombre total d'utilisateurs: ${allUsers.length}\n`);
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email}`);
        console.log(`      - NumeroH: ${user.numeroH}`);
        console.log(`      - Nom: ${user.prenom} ${user.nomFamille}`);
        console.log(`      - Rôle: ${user.role}`);
        console.log(`      - Actif: ${user.isActive ? 'Oui' : 'Non'}`);
        console.log(`      - Créé le: ${user.createdAt}\n`);
      });
    }

    // 3. Recherche spécifique de l'admin
    console.log('3️⃣ Recherche spécifique de l\'admin:');
    console.log(`   Email recherché: ${email}\n`);
    
    const admin = await User.findOne({ 
      where: { email },
      attributes: ['numeroH', 'email', 'prenom', 'nomFamille', 'role', 'isActive', 'password', 'createdAt', 'metadata']
    });

    if (!admin) {
      console.log('   ❌ UTILISATEUR NON TROUVÉ dans la base de données\n');
      console.log('   💡 Le compte admin n\'existe pas encore.\n');
      console.log('   🔧 Solution: Exécutez le script de création:');
      console.log('      node scripts/createAdmin.js\n');
    } else {
      console.log('   ✅ UTILISATEUR TROUVÉ !\n');
      console.log('   📋 Informations du compte:');
      console.log(`      - NumeroH: ${admin.numeroH}`);
      console.log(`      - Email: ${admin.email}`);
      console.log(`      - Nom: ${admin.prenom} ${admin.nomFamille}`);
      console.log(`      - Rôle: ${admin.role}`);
      console.log(`      - Actif: ${admin.isActive ? 'Oui ✅' : 'Non ❌'}`);
      console.log(`      - Créé le: ${admin.createdAt}\n`);

      // Vérifier le mot de passe
      console.log('4️⃣ Vérification du mot de passe...');
      const passwordValid = await bcrypt.compare(password, admin.password);
      if (passwordValid) {
        console.log('   ✅ Mot de passe CORRECT\n');
      } else {
        console.log('   ❌ Mot de passe INCORRECT\n');
        console.log('   💡 Le mot de passe dans la base ne correspond pas à ADMIN_PASSWORD\n');
      }

      // Vérifier le rôle
      console.log('5️⃣ Vérification du rôle...');
      if (admin.role === 'admin') {
        console.log('   ✅ Rôle ADMIN confirmé\n');
      } else {
        console.log(`   ⚠️ Rôle actuel: ${admin.role} (devrait être "admin")\n`);
        console.log('   💡 Le compte existe mais n\'est pas admin\n');
      }

      // Résumé final
      if (passwordValid && admin.role === 'admin' && admin.isActive) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ COMPTE ADMIN TROUVÉ ET PRÊT POUR LA CONNEXION !');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('📧 Email:', email);
        console.log('🔑 Mot de passe:', '(celui de ADMIN_PASSWORD)');
        console.log('👤 NumeroH:', admin.numeroH);
        console.log('🎭 Rôle:', admin.role);
        console.log('✅ Actif:', admin.isActive ? 'Oui' : 'Non');
        console.log('\n💡 Vous pouvez maintenant vous connecter sur le frontend !\n');
      } else {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️ COMPTE TROUVÉ MAIS PROBLÈME DÉTECTÉ');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        if (!passwordValid) {
          console.log('❌ Mot de passe incorrect');
        }
        if (admin.role !== 'admin') {
          console.log('❌ Rôle incorrect:', admin.role);
        }
        if (!admin.isActive) {
          console.log('❌ Compte désactivé');
        }
        console.log('\n💡 Solution: Exécutez le script de mise à jour:');
        console.log('   node scripts/createAdmin.js\n');
      }
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error('   Code:', error.code || 'N/A');
    console.error('   Type:', error.name || 'N/A');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 PostgreSQL n\'est pas démarré');
      console.error('   Solution: Démarrez le service PostgreSQL');
    } else if (error.code === '28P01') {
      console.error('\n💡 Mot de passe PostgreSQL incorrect');
      console.error('   Solution: Vérifiez DB_PASSWORD dans config.env');
    } else if (error.code === '3D000') {
      console.error('\n💡 Base de données "diangou" n\'existe pas');
      console.error('   Solution: Créez-la avec CREATE DATABASE diangou;');
    } else {
      console.error('\n💡 Détails:', error);
    }
    
    process.exit(1);
  }
}

verifierDansBase();

