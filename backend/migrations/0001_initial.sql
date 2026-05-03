-- ═══════════════════════════════════════════════════════════════════════════
-- Schéma D1 (SQLite) — Les Enfants d'Adam et Eve
-- Cloudflare D1 migration initiale
-- Exécuter : wrangler d1 execute enfants-adam-db --file=./migrations/0001_initial.sql
-- ═══════════════════════════════════════════════════════════════════════════

PRAGMA foreign_keys=ON;

-- ─── UTILISATEURS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  numero_h              TEXT PRIMARY KEY,
  password              TEXT NOT NULL,
  type                  TEXT NOT NULL DEFAULT 'vivant',
  role                  TEXT NOT NULL DEFAULT 'user',
  is_active             INTEGER NOT NULL DEFAULT 1,
  is_verified           INTEGER NOT NULL DEFAULT 0,

  -- Identité
  prenom                TEXT,
  nom_famille           TEXT,
  genre                 TEXT,
  date_naissance        TEXT,
  email                 TEXT,
  tel1                  TEXT,
  tel2                  TEXT,

  -- Origine
  ethnie                TEXT,
  region_origine        TEXT,
  pays                  TEXT,
  nationalite           TEXT,
  lieu_naissance        TEXT,
  rang_naissance        TEXT,
  generation            TEXT,

  -- Statut social
  statut_social         TEXT,
  religion              TEXT,
  situation_eco         TEXT,
  etat_physique         TEXT,
  situation_sanitaire   TEXT,
  nb_femmes             INTEGER DEFAULT 0,

  -- Famille (chiffres)
  nb_freres_mere        INTEGER DEFAULT 0,
  nb_soeurs_mere        INTEGER DEFAULT 0,
  nb_freres_pere        INTEGER DEFAULT 0,
  nb_soeurs_pere        INTEGER DEFAULT 0,
  nb_filles             INTEGER DEFAULT 0,
  nb_garcons            INTEGER DEFAULT 0,
  nb_tantes_maternelles INTEGER DEFAULT 0,
  nb_tantes_paternelles INTEGER DEFAULT 0,
  nb_oncles_maternels   INTEGER DEFAULT 0,
  nb_oncles_paternels   INTEGER DEFAULT 0,
  nb_cousins            INTEGER DEFAULT 0,
  nb_cousines           INTEGER DEFAULT 0,

  -- Parents
  numero_h_pere         TEXT,
  numero_h_mere         TEXT,
  prenom_pere           TEXT,
  prenom_mere           TEXT,
  pere_statut           TEXT,
  mere_statut           TEXT,
  famille_pere          TEXT,
  famille_mere          TEXT,

  -- Activités
  activite1             TEXT,
  activite2             TEXT,
  activite3             TEXT,

  -- Résidences
  lieu1                 TEXT,
  lieu2                 TEXT,
  lieu3                 TEXT,
  prefecture            TEXT,
  sous_prefecture       TEXT,
  lieu_residence1       TEXT,
  lieu_residence2       TEXT,
  lieu_residence3       TEXT,

  -- Défunt
  date_deces            TEXT,
  annee_deces           INTEGER,
  lieu_deces            TEXT,
  age_obtenu            INTEGER,
  annees_depuis_deces   INTEGER,

  -- Langues
  langues               TEXT DEFAULT '[]',
  langues_autre         TEXT,

  -- Médias (R2 keys ou base64 legacy)
  photo                 TEXT,
  video                 TEXT,
  preuve                TEXT,
  family_photo          TEXT,
  man_photo             TEXT,
  wife_photo            TEXT,
  children_photos       TEXT DEFAULT '[]',
  gallery_albums        TEXT DEFAULT '[]',

  -- Portefeuille
  wallet                REAL DEFAULT 0,
  wallet_currency       TEXT DEFAULT 'GNF',

  -- Arbre
  tree_visibility       TEXT DEFAULT 'name_only',
  tree_hidden           TEXT DEFAULT '[]',
  children              TEXT DEFAULT '[]',
  parents               TEXT DEFAULT '[]',
  user_stories          TEXT,
  fingerprint           TEXT,

  last_login            TEXT,
  created_at            TEXT DEFAULT (datetime('now')),
  updated_at            TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type        ON users(type);
CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_generation  ON users(generation);
CREATE INDEX IF NOT EXISTS idx_users_num_pere    ON users(numero_h_pere);
CREATE INDEX IF NOT EXISTS idx_users_num_mere    ON users(numero_h_mere);

-- ─── MEMBRES DÉCÉDÉS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deceased_members (
  numero_h    TEXT PRIMARY KEY,
  nom         TEXT,
  prenom      TEXT,
  annee_deces INTEGER,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ─── ADMINISTRATEURS DE PAGE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_admins (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  owner_numero_h  TEXT NOT NULL,
  admin_numero_h  TEXT NOT NULL,
  level           TEXT NOT NULL DEFAULT 'G0',
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(owner_numero_h, admin_numero_h)
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  numero_h    TEXT NOT NULL,
  type        TEXT NOT NULL,
  title       TEXT,
  message     TEXT NOT NULL,
  data        TEXT DEFAULT '{}',
  is_read     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notif_numero_h ON notifications(numero_h);
CREATE INDEX IF NOT EXISTS idx_notif_is_read  ON notifications(is_read);

-- ─── COMPTES PROFESSIONNELS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS professional_accounts (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  owner_numero_h    TEXT NOT NULL,
  type              TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  address           TEXT,
  phone             TEXT,
  email             TEXT,
  website           TEXT,
  logo_url          TEXT,
  status            TEXT NOT NULL DEFAULT 'active',
  services          TEXT DEFAULT '[]',
  specialties       TEXT DEFAULT '[]',
  subscription_end  TEXT,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pro_owner  ON professional_accounts(owner_numero_h);
CREATE INDEX IF NOT EXISTS idx_pro_type   ON professional_accounts(type);
CREATE INDEX IF NOT EXISTS idx_pro_status ON professional_accounts(status);

-- ─── RENDEZ-VOUS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id                      TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  professional_account_id TEXT NOT NULL,
  patient_numero_h        TEXT NOT NULL,
  patient_name            TEXT,
  type                    TEXT NOT NULL DEFAULT 'written',
  status                  TEXT NOT NULL DEFAULT 'pending',
  service                 TEXT,
  date                    TEXT,
  time                    TEXT,
  notes                   TEXT,
  reason                  TEXT,
  video_url               TEXT,
  response_video_url      TEXT,
  created_at              TEXT DEFAULT (datetime('now')),
  updated_at              TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_appt_pro     ON appointments(professional_account_id);
CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_numero_h);
CREATE INDEX IF NOT EXISTS idx_appt_status  ON appointments(status);

-- ─── BADGES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  color       TEXT,
  criteria    TEXT,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_badges (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  numero_h    TEXT NOT NULL,
  badge_id    TEXT NOT NULL,
  awarded_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(numero_h, badge_id)
);

-- ─── LOGOS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logos (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  category    TEXT,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_logos (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  numero_h    TEXT NOT NULL,
  logo_id     TEXT NOT NULL,
  assigned_at TEXT DEFAULT (datetime('now')),
  UNIQUE(numero_h, logo_id)
);

-- ─── AMIS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friend_requests (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  from_numero_h TEXT NOT NULL,
  to_numero_h   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(from_numero_h, to_numero_h)
);

CREATE TABLE IF NOT EXISTS friends (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  numero_h1   TEXT NOT NULL,
  numero_h2   TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(numero_h1, numero_h2)
);

-- ─── LIENS PARENT-ENFANT ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parent_child_links (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  parent_numero_h TEXT NOT NULL,
  child_numero_h  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(parent_numero_h, child_numero_h)
);

CREATE TABLE IF NOT EXISTS parent_child_activities (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  parent_numero_h TEXT NOT NULL,
  child_numero_h  TEXT NOT NULL,
  from_numero_h   TEXT NOT NULL,
  type            TEXT DEFAULT 'message',
  content         TEXT,
  media_url       TEXT,
  is_active       INTEGER DEFAULT 1,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- ─── LIENS DE COUPLE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS couple_links (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  numero_h1   TEXT NOT NULL,
  numero_h2   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(numero_h1, numero_h2)
);

CREATE TABLE IF NOT EXISTS couple_activities (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  numero_h1       TEXT NOT NULL,
  numero_h2       TEXT NOT NULL,
  from_numero_h   TEXT NOT NULL,
  to_numero_h     TEXT NOT NULL,
  type            TEXT DEFAULT 'message',
  content         TEXT,
  media_url       TEXT,
  is_active       INTEGER DEFAULT 1,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- ─── GALERIE FAMILIALE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_gallery (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  family_name       TEXT NOT NULL,
  uploader_numero_h TEXT NOT NULL,
  uploader_name     TEXT DEFAULT 'Membre',
  album             TEXT NOT NULL,
  url               TEXT NOT NULL,
  type              TEXT DEFAULT 'image',
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fg_family ON family_gallery(family_name);
CREATE INDEX IF NOT EXISTS idx_fg_album  ON family_gallery(album);

-- ─── MÉDIAS PROBLÈMES FAMILLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_problem_media (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  numero_h          TEXT NOT NULL,
  family_name       TEXT NOT NULL,
  media_url         TEXT NOT NULL,
  type              TEXT DEFAULT 'image',
  description       TEXT,
  created_at        TEXT DEFAULT (datetime('now'))
);

-- ─── ARBRE GÉNÉALOGIQUE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_trees (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  owner       TEXT NOT NULL,
  name        TEXT,
  description TEXT,
  is_public   INTEGER DEFAULT 0,
  data        TEXT DEFAULT '{}',
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS family_tree_confirmations (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  requester     TEXT NOT NULL,
  target        TEXT NOT NULL,
  relation_type TEXT,
  status        TEXT DEFAULT 'pending',
  created_at    TEXT DEFAULT (datetime('now'))
);

-- ─── PUBLICATIONS SCIENCE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS science_posts (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title       TEXT NOT NULL DEFAULT 'Sans titre',
  content     TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'text',
  media_url   TEXT,
  category    TEXT NOT NULL DEFAULT 'recentes',
  author      TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  likes       TEXT DEFAULT '[]',
  comments    TEXT DEFAULT '[]',
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sp_category   ON science_posts(category);
CREATE INDEX IF NOT EXISTS idx_sp_author     ON science_posts(author);

CREATE TABLE IF NOT EXISTS science_permissions (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  numero_h    TEXT NOT NULL UNIQUE,
  is_active   INTEGER DEFAULT 1,
  granted_by  TEXT NOT NULL DEFAULT '',
  granted_at  TEXT DEFAULT (datetime('now')),
  expires_at  TEXT,
  notes       TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─── PUBLICATIONS RÉALITÉ ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reality_posts (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title       TEXT DEFAULT 'Sans titre',
  content     TEXT NOT NULL DEFAULT '',
  type        TEXT DEFAULT 'text',
  category    TEXT DEFAULT 'message',
  media_url   TEXT,
  author      TEXT NOT NULL,
  author_name TEXT DEFAULT '',
  likes       TEXT DEFAULT '[]',
  comments    TEXT DEFAULT '[]',
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ─── GROUPES D'ACTIVITÉS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_groups (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  description TEXT,
  owner       TEXT NOT NULL,
  members     TEXT DEFAULT '[]',
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_messages (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  group_id    TEXT NOT NULL,
  author      TEXT NOT NULL,
  author_name TEXT,
  content     TEXT,
  media_url   TEXT,
  type        TEXT DEFAULT 'text',
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_act_msg_group ON activity_messages(group_id);

-- ─── GROUPES RÉGION ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS region_groups (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  region      TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  owner       TEXT NOT NULL,
  members     TEXT DEFAULT '[]',
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS region_messages (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  group_id    TEXT NOT NULL,
  author      TEXT NOT NULL,
  author_name TEXT,
  content     TEXT,
  media_url   TEXT,
  type        TEXT DEFAULT 'text',
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rg_region ON region_groups(region);

-- ─── GROUPES RÉSIDENCE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS residence_groups (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  location    TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  owner       TEXT NOT NULL,
  members     TEXT DEFAULT '[]',
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS residence_messages (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  group_id    TEXT NOT NULL,
  author      TEXT NOT NULL,
  author_name TEXT,
  content     TEXT,
  media_url   TEXT,
  type        TEXT DEFAULT 'text',
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─── ÉDUCATION ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title       TEXT NOT NULL,
  description TEXT,
  content     TEXT,
  category    TEXT,
  media_url   TEXT,
  author      TEXT NOT NULL,
  level       TEXT DEFAULT 'debutant',
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS formations (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  author      TEXT NOT NULL,
  capacity    INTEGER,
  price       REAL DEFAULT 0,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS formation_registrations (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  formation_id TEXT NOT NULL,
  numero_h     TEXT NOT NULL,
  status       TEXT DEFAULT 'pending',
  created_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(formation_id, numero_h)
);

-- ─── ÉCHANGES / MARKETPLACE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exchange_products (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title       TEXT NOT NULL,
  description TEXT,
  price       REAL,
  currency    TEXT DEFAULT 'GNF',
  category    TEXT,
  images      TEXT DEFAULT '[]',
  seller      TEXT NOT NULL,
  seller_name TEXT,
  status      TEXT DEFAULT 'active',
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ep_seller   ON exchange_products(seller);
CREATE INDEX IF NOT EXISTS idx_ep_category ON exchange_products(category);
CREATE INDEX IF NOT EXISTS idx_ep_status   ON exchange_products(status);

-- ─── DOCUMENTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title       TEXT NOT NULL,
  description TEXT,
  file_url    TEXT,
  file_name   TEXT,
  file_size   INTEGER,
  file_type   TEXT,
  owner       TEXT NOT NULL,
  is_public   INTEGER DEFAULT 0,
  permissions TEXT DEFAULT '[]',
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ─── DÉFI ÉDUCATIF ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS defi_questions (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  question_text       TEXT,
  question_media_url  TEXT,
  type                TEXT DEFAULT 'text',
  category            TEXT,
  author              TEXT NOT NULL,
  author_name         TEXT,
  is_active           INTEGER DEFAULT 1,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS defi_answers (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  question_id      TEXT NOT NULL,
  responder        TEXT NOT NULL,
  responder_name   TEXT,
  answer_text      TEXT,
  answer_media_url TEXT,
  type             TEXT DEFAULT 'text',
  is_correct       INTEGER DEFAULT 0,
  score            INTEGER DEFAULT 0,
  created_at       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_da_question ON defi_answers(question_id);

-- ─── COMMUNAUTÉS RELIGIEUSES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faith_communities (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  religion    TEXT NOT NULL,
  description TEXT,
  owner       TEXT NOT NULL,
  members     TEXT DEFAULT '[]',
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faith_contents (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  community_id TEXT NOT NULL,
  title       TEXT,
  content     TEXT,
  type        TEXT DEFAULT 'text',
  media_url   TEXT,
  author      TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─── ORGANISATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_groups (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  type        TEXT,
  description TEXT,
  owner       TEXT NOT NULL,
  members     TEXT DEFAULT '[]',
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS organization_posts (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  group_id    TEXT NOT NULL,
  title       TEXT,
  content     TEXT,
  media_url   TEXT,
  type        TEXT DEFAULT 'text',
  author      TEXT NOT NULL,
  author_name TEXT,
  likes       TEXT DEFAULT '[]',
  comments    TEXT DEFAULT '[]',
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─── HISTOIRES UTILISATEURS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_stories (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  numero_h    TEXT NOT NULL,
  type        TEXT NOT NULL,
  section     TEXT,
  content     TEXT,
  media_url   TEXT,
  is_public   INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS published_stories (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  numero_h    TEXT NOT NULL,
  title       TEXT,
  content     TEXT,
  media_url   TEXT,
  likes       TEXT DEFAULT '[]',
  comments    TEXT DEFAULT '[]',
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─── MESSAGES D'ÉTAT ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS state_messages (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  sender      TEXT NOT NULL,
  recipient   TEXT NOT NULL,
  subject     TEXT,
  content     TEXT NOT NULL,
  attachments TEXT DEFAULT '[]',
  is_read     INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'sent',
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS state_products (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title       TEXT NOT NULL,
  description TEXT,
  image_url   TEXT,
  price       REAL,
  category    TEXT,
  publisher   TEXT NOT NULL,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ─── GOUVERNEMENTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS governments (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  type        TEXT,
  level       TEXT,
  region      TEXT,
  description TEXT,
  logo_url    TEXT,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS government_members (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  government_id TEXT NOT NULL,
  numero_h      TEXT NOT NULL,
  name          TEXT,
  role          TEXT,
  photo_url     TEXT,
  is_active     INTEGER DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gm_gov ON government_members(government_id);

-- ─── PAIEMENTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  numero_h        TEXT NOT NULL,
  amount          REAL NOT NULL,
  currency        TEXT DEFAULT 'GNF',
  type            TEXT,
  status          TEXT DEFAULT 'pending',
  tx_ref          TEXT UNIQUE,
  flw_ref         TEXT,
  description     TEXT,
  metadata        TEXT DEFAULT '{}',
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pay_numero_h ON payments(numero_h);
CREATE INDEX IF NOT EXISTS idx_pay_status   ON payments(status);

-- ─── POINTS / QUOTAS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS points_transactions (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  numero_h    TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  type        TEXT NOT NULL,
  description TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gallery_quotas (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  numero_h    TEXT NOT NULL UNIQUE,
  max_photos  INTEGER DEFAULT 10,
  used_photos INTEGER DEFAULT 0,
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ─── IA CONVERSATIONS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ia_conversations (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  numero_h    TEXT NOT NULL,
  messages    TEXT DEFAULT '[]',
  subject     TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ia_numero_h ON ia_conversations(numero_h);

-- ─── ZAKA / DONS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS poor_persons (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  numero_h    TEXT NOT NULL UNIQUE,
  name        TEXT,
  needs       TEXT,
  contact     TEXT,
  verified    INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─── MODÉRATION ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moderation_reports (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  reporter        TEXT NOT NULL,
  target_type     TEXT NOT NULL,
  target_id       TEXT NOT NULL,
  reason          TEXT,
  status          TEXT DEFAULT 'pending',
  resolved_by     TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- ─── SANTÉ ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health_products (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  price       REAL,
  image_url   TEXT,
  seller      TEXT NOT NULL,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS holy_books (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title       TEXT NOT NULL,
  religion    TEXT NOT NULL,
  content_url TEXT,
  description TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);
