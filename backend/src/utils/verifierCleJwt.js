import { createHash } from 'crypto';

/**
 * Vérification au démarrage : la clé JWT utilisée n'est-elle pas une clé déjà
 * publiée (historique Git public, fichiers d'exemple) ? Si oui, n'importe qui
 * pourrait fabriquer un jeton de connexion pour n'importe quel compte : alerte
 * dans le journal des erreurs (l'admin est notifié). Seules des empreintes
 * SHA-256 sont gardées ici, jamais les clés.
 */
const EMPREINTES_PUBLIEES = new Set([
  'a28d048a8fd43c60577bb4a5c2bfa5bd489ffd9f66bb6684c715995caa941a09',
  'bb2d969a429f58ae1a0b2c0be3f255be7fa60f7bb673b539c163a4408ca0c84d',
  'd5bb316aaf6ac4fe6f0a3d18ed21cc5d1b05d698c5a647c3c0840a133866e1c3',
  'e33e655a5f0cc3fc8330a31b0abe5b292d0bd9070ff441b6a7348e43e3aa1cae',
]);

export function problemeCleJwt(secret) {
  if (!secret) return null;
  if (EMPREINTES_PUBLIEES.has(createHash('sha256').update(String(secret)).digest('hex'))) {
    return 'JWT_SECRET est une clé déjà publiée : changez-la tout de suite chez l\'hébergeur (tout le monde devra se reconnecter une fois).';
  }
  if (String(secret).length < 32) {
    return 'JWT_SECRET est trop courte (moins de 32 caractères) : choisissez une clé longue et aléatoire chez l\'hébergeur.';
  }
  return null;
}
