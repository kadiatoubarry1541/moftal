import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize, connectDB } from '../config/database.js';
import User from '../src/models/User.js';
import { config } from '../config.js';

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const ADMIN_NUMERO_H = process.env.ADMIN_NUMERO_H || 'G7C7P7R7E7F7 7'; // G0… n'est plus administrateur
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_ROLE = 'super-admin';

// Vérifier que le mot de passe admin est défini
if (!ADMIN_PASSWORD) {
  console.error('❌ ERREUR: La variable d\'environnement ADMIN_PASSWORD n\'est pas définie!');
  console.error('💡 Ajoutez ADMIN_PASSWORD=votre_mot_de_passe dans le fichier backend/config.env');
  process.exit(1);
}

async function initAdmin() {
  try {
    console.log('🔧 Initialisation du compte administrateur...');
    
    // Se connecter à la base de données
    await connectDB();
    console.log('✅ Connexion à la base de données réussie');
    
    // Vérifier si l'admin existe déjà
    const existingAdmin = await User.findByNumeroH(ADMIN_NUMERO_H);
    
    if (existingAdmin) {
      console.log('📦 Compte administrateur existe déjà');
      
      // Vérifier et mettre à jour si nécessaire
      let needsUpdate = false;
      const updates = {};
      
      // Vérifier le rôle
      if (existingAdmin.role !== ADMIN_ROLE) {
        updates.role = ADMIN_ROLE;
        needsUpdate = true;
        console.log('⚠️  Rôle incorrect, mise à jour nécessaire');
      }
      
      // Vérifier si le compte est actif
      if (!existingAdmin.isActive) {
        updates.isActive = true;
        needsUpdate = true;
        console.log('⚠️  Compte désactivé, activation nécessaire');
      }
      
      // Vérifier le mot de passe (hashé)
      const isPasswordValid = await bcrypt.compare(ADMIN_PASSWORD, existingAdmin.password);
      if (!isPasswordValid) {
        // Hasher le nouveau mot de passe
        const saltRounds = config.BCRYPT_ROUNDS || 12;
        updates.password = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);
        needsUpdate = true;
        console.log('⚠️  Mot de passe incorrect, mise à jour nécessaire');
      }
      
      if (needsUpdate) {
        await existingAdmin.update(updates);
        console.log('✅ Compte administrateur mis à jour avec succès');
      } else {
        console.log('✅ Compte administrateur déjà configuré correctement');
      }
      
      // Afficher les informations
      console.log('\n📋 Informations du compte administrateur:');
      console.log(`   NumeroH: ${existingAdmin.numeroH}`);
      console.log(`   Nom: ${existingAdmin.prenom} ${existingAdmin.nomFamille}`);
      console.log(`   Rôle: ${existingAdmin.role}`);
      console.log(`   Actif: ${existingAdmin.isActive ? 'Oui' : 'Non'}`);
      console.log(`   Mot de passe: ${ADMIN_PASSWORD}`);
      
    } else {
      // Créer le compte administrateur
      console.log('📝 Création du compte administrateur...');
      
      // Hasher le mot de passe
      const saltRounds = config.BCRYPT_ROUNDS || 12;
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);
      
      const admin = await User.create({
        numeroH: ADMIN_NUMERO_H,
        prenom: 'Administrateur',
        nomFamille: 'Principal',
        password: hashedPassword,
        role: ADMIN_ROLE,
        isActive: true,
        isVerified: true,
        type: 'vivant',
        genre: 'AUTRE',
        generation: 'G0'
      });
      
      console.log('✅ Compte administrateur créé avec succès');
      console.log('\n📋 Informations du compte administrateur:');
      console.log(`   NumeroH: ${admin.numeroH}`);
      console.log(`   Nom: ${admin.prenom} ${admin.nomFamille}`);
      console.log(`   Rôle: ${admin.role}`);
      console.log(`   Mot de passe: ${ADMIN_PASSWORD}`);
    }
    
    console.log('\n🎉 Initialisation terminée avec succès!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

// Exécuter l'initialisation
initAdmin();
