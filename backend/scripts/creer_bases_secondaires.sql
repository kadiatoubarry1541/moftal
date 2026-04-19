-- =============================================================================
-- SCRIPT : Création des bases de données secondaires
-- Projet : Les Enfants d'Adam
-- Exécuter dans psql en tant que super-utilisateur (postgres)
-- =============================================================================

-- 1. BASE "professionnel"
--    Comptes pros : cliniques, sécurité, entreprises, écoles, gouvernements
-- =============================================================================
SELECT 'Création de la base professionnel...' AS info;
CREATE DATABASE professionnel
  WITH OWNER = postgres
  ENCODING = 'UTF8'
  LC_COLLATE = 'French_France.1252'
  LC_CTYPE = 'French_France.1252'
  TEMPLATE = template0;

COMMENT ON DATABASE professionnel IS
  'Comptes professionnels : ProfessionalAccount, Appointment, Doctor, Hospital, School, SecurityAgent, Supplier, Government, GovernmentMember';

-- 2. BASE "IAscience"
--    IA et Science : conversations IA, connaissances, posts scientifiques
-- =============================================================================
SELECT 'Création de la base IAscience...' AS info;
CREATE DATABASE "IAscience"
  WITH OWNER = postgres
  ENCODING = 'UTF8'
  LC_COLLATE = 'French_France.1252'
  LC_CTYPE = 'French_France.1252'
  TEMPLATE = template0;

COMMENT ON DATABASE "IAscience" IS
  'IA et Science : IaConversation, IaKnowledge, SciencePost, SciencePermission + tables Python (conversations, sessions, messages)';

-- 3. BASE "temps"
--    Histoire humaine : sections historiques, événements, périodes, civilisations
-- =============================================================================
SELECT 'Création de la base temps...' AS info;
CREATE DATABASE temps
  WITH OWNER = postgres
  ENCODING = 'UTF8'
  LC_COLLATE = 'French_France.1252'
  LC_CTYPE = 'French_France.1252'
  TEMPLATE = template0;

COMMENT ON DATABASE temps IS
  'Histoire humaine : HistorySection, PublishedStory, HolyBook, RealityPost, HistoricalEvent, HistoricalPeriod, Civilization';

SELECT '✅ Les 3 bases ont été créées avec succès !' AS resultat;
SELECT '   → professionnel' AS details
UNION ALL SELECT '   → IAscience'
UNION ALL SELECT '   → temps';