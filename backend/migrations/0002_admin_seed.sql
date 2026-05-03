-- Création du compte Super Admin (G7C7P7R7E7F7 7) et Sous-Admin (G0C0P0R0E0F0 0)
-- Mot de passe par défaut : admin1234  (à changer après la première connexion)
-- Hash bcrypt 6 rounds de "admin1234"

INSERT OR IGNORE INTO users (
  numero_h, password, type, role, is_active, is_verified,
  prenom, nom_famille, genre, generation,
  created_at, updated_at
) VALUES
  (
    'G7C7P7R7E7F7 7',
    '$2a$06$BrgKZw93neBE7sa44pwBn.R2LRqNg0g3efSjPDaNaV6DmsAfsv4Bm',
    'vivant', 'admin', 1, 1,
    'Super', 'Admin', 'MASCULIN', 'G7',
    datetime('now'), datetime('now')
  ),
  (
    'G0C0P0R0E0F0 0',
    '$2a$06$BrgKZw93neBE7sa44pwBn.R2LRqNg0g3efSjPDaNaV6DmsAfsv4Bm',
    'vivant', 'admin', 1, 1,
    'Admin', 'Principal', 'MASCULIN', 'G0',
    datetime('now'), datetime('now')
  );
