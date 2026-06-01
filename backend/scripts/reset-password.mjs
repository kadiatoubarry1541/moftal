import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { sequelize, connectDB } from '../config/database.js';
import User from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

// ── Paramètres à modifier ──────────────────────────────────────────────
const NUMERO_H      = 'G7C7P7R7E7F7 7';
const NEW_PASSWORD  = 'Alphabobomodizakoolo2025@amourpur';
// ──────────────────────────────────────────────────────────────────────

async function resetPassword() {
  try {
    console.log('Connexion à la base de données...');
    await connectDB();
    console.log('Connecté.\n');

    // Chercher l'utilisateur
    const user = await User.findByNumeroH(NUMERO_H);

    if (!user) {
      console.log(`Aucun utilisateur trouvé avec le NumeroH : "${NUMERO_H}"`);
      console.log('Vérifiez le NumeroH exactement tel qu\'il est en base.');
      process.exit(1);
    }

    console.log(`Utilisateur trouvé : ${user.prenom} ${user.nomFamille} (${user.numeroH})`);

    // Hasher le nouveau mot de passe
    const hash = await bcrypt.hash(NEW_PASSWORD, 12);

    // Mettre à jour directement via SQL pour éviter les hooks
    await sequelize.query(
      `UPDATE users SET password = :hash WHERE numero_h = :numeroH`,
      { replacements: { hash, numeroH: user.numeroH } }
    );

    console.log('\nMot de passe réinitialisé avec succès !');
    console.log(`NumeroH  : ${NUMERO_H}`);
    console.log(`Nouveau  : ${NEW_PASSWORD}`);

  } catch (error) {
    console.error('Erreur :', error.message);
  } finally {
    await sequelize.close().catch(() => {});
    process.exit(0);
  }
}

resetPassword();
