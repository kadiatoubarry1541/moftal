import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize, connectDB } from '../config/database.js';
import User from '../src/models/User.js';
import bcrypt from 'bcryptjs';

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const ADMIN_NUMERO_H = process.env.ADMIN_NUMERO_H || 'G7C7P7R7E7F7 7'; // G0… n'est plus administrateur
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Vérifier que le mot de passe admin est défini
if (!ADMIN_PASSWORD) {
  console.error('❌ ERREUR: La variable d\'environnement ADMIN_PASSWORD n\'est pas définie!');
  console.error('💡 Ajoutez ADMIN_PASSWORD=votre_mot_de_passe dans le fichier backend/config.env');
  process.exit(1);
}

async function verifyAdmin() {
  try {
    console.log('🔍 Vérification du compte administrateur...\n');
    
    // Se connecter à la base de données
    await connectDB();
    console.log('✅ Connexion à la base de données réussie\n');
    
    // Chercher l'admin
    const admin = await User.findByNumeroH(ADMIN_NUMERO_H);
    
    if (!admin) {
      console.log('❌ ERREUR: Compte administrateur non trouvé!');
      console.log('💡 Solution: Exécutez "npm run init-admin" pour créer le compte\n');
      process.exit(1);
    }
    
    console.log('✅ Compte administrateur trouvé\n');
    console.log('📋 Informations du compte:');
    console.log(`   NumeroH: ${admin.numeroH}`);
    console.log(`   Nom: ${admin.prenom} ${admin.nomFamille}`);
    console.log(`   Rôle: ${admin.role}`);
    console.log(`   Actif: ${admin.isActive ? 'Oui ✅' : 'Non ❌'}`);
    console.log(`   Vérifié: ${admin.isVerified ? 'Oui ✅' : 'Non ❌'}\n`);
    
    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(ADMIN_PASSWORD, admin.password);
    if (!isPasswordValid) {
      console.log('❌ ERREUR: Mot de passe incorrect!');
      console.log('💡 Solution: Exécutez "npm run init-admin" pour réinitialiser le mot de passe\n');
      process.exit(1);
    }
    console.log('✅ Mot de passe correct\n');
    
    // Vérifier le rôle
    if (admin.role !== 'super-admin') {
      console.log(`⚠️  ATTENTION: Le rôle est "${admin.role}" au lieu de "super-admin"`);
      console.log('💡 Solution: Exécutez "npm run init-admin" pour corriger le rôle\n');
    } else {
      console.log('✅ Rôle correct (super-admin)\n');
    }
    
    // Vérifier si le compte est actif
    if (!admin.isActive) {
      console.log('⚠️  ATTENTION: Le compte est désactivé!');
      console.log('💡 Solution: Exécutez "npm run init-admin" pour activer le compte\n');
    }
    
    console.log('🎉 Toutes les vérifications sont passées avec succès!');
    console.log('\n📝 Informations de connexion:');
    console.log(`   NumeroH: ${ADMIN_NUMERO_H}`);
    console.log(`   Mot de passe: ${ADMIN_PASSWORD}\n`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    process.exit(1);
  }
}

// Exécuter la vérification
verifyAdmin();
