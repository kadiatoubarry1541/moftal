# Passage du serveur Moftal sur Cloudflare — branche `migration-cloudflare`

Objectif : faire tourner le **serveur** de Moftal (aujourd'hui sur Render) dans
**Cloudflare Workers**, gratuitement, sans toucher à `main` tant que tout ne marche
pas à 100 %. Le site est déjà sur Cloudflare.

## Ce qui est déjà fait (essai du 18/11/2026)

Lancé en local avec l'outil officiel de Cloudflare (`npx wrangler dev`, dossier
`backend/`), sur une base PostgreSQL de test :

| Étape | Résultat |
|---|---|
| Le serveur Express de Moftal démarre dans le moteur de Cloudflare | ✅ |
| Connexion à PostgreSQL, préparation de toutes les tables | ✅ |
| `GET /api/health` | ✅ `dbConnected: true` |
| Connexion (`POST /api/auth/login`) sur une demande suivante | ✅ répond correctement |
| Inscription rapide (`POST /api/auth/register-quick`) | ✅ corrigée (19/11) |
| 10 inscriptions et 10 lectures **en même temps** | ✅ |
| 241 pages `GET` du serveur, l'une après l'autre | ✅ aucun blocage (2 erreurs qui existent aussi sur Render : `/api/friends/suggestions`, `/api/family/tree`) |
| Messagerie en direct (socket.io) | ❌ impossible chez Cloudflare → à refaire |

## Corrections déjà faites (sans effet sur le serveur actuel)

- `iconv-lite` forcé en 0.6.3 (l'ancienne version ne se charge pas chez Cloudflare).
- Sequelize reçoit directement le pilote PostgreSQL (`dialectModule: pg`).
- `UPLOADS_DIR` : dossier de passage des fichiers (chez Cloudflare : `/tmp/uploads`).
- `serveurPret` (server.js) : promesse résolue quand la base est prête et le serveur à l'écoute.
- `SANS_TEMPS_REEL=true` : socket.io désactivé seulement chez Cloudflare.
- `CONNEXION_PAR_DEMANDE=true` (`src/config/demandeCourante.js`) : chaque demande a sa
  propre petite réserve de connexions à la base (4 au plus), fermée quand la réponse
  part. Chez Cloudflare, une connexion ne peut pas servir à deux demandes : c'était la
  cause du blocage de l'inscription. Branché sur **les deux** fichiers de connexion
  (`src/config/database.js` et `config/database.js`, utilisé par les comptes).
- `SANS_COMPRESSION=true` : Cloudflare compresse lui-même (sinon réponses illisibles).
- `backend/worker.js` : charge le serveur à la **première demande** (au chargement du
  fichier, Cloudflare interdit les connexions et les minuteries).
- `backend/wrangler.exemple.toml` : modèle des réglages (à copier en `wrangler.toml`,
  ignoré par git) ; les valeurs de test ou secrètes vont dans `backend/.dev.vars` (ignoré).

Tous les tests du serveur passent toujours (32 réussis, 0 échec).

## Ce qu'il reste à faire

1. ~~Inscription bloquée~~ ✅. Reste : tester les envois (`POST`) de chaque grande
   partie : profil, familles, rendez-vous, Échanges, gestions des pros, paiements.
2. **Temps réel** (messages, appels) : socket.io → **Durable Objects** de Cloudflare
   (WebSockets), disponibles sur l'offre gratuite.
3. **Tâches régulières** (abonnements chaque heure, nettoyage des messages) :
   minuteries → **Cron Triggers** de Cloudflare.
4. **E-mails** : vérifier que l'envoi passe par les API (Brevo, MailerSend) et non
   par un serveur SMTP (impossible chez Cloudflare).
5. **Temps de calcul — mesuré le 19/11** : l'offre gratuite limite à **10 ms de
   calcul par demande**. Mesures :
   - vérifier un mot de passe (connexion) : **≈ 90 ms** (9 fois la limite) ;
   - démarrer une copie du serveur (Cloudflare en lance souvent) : **≈ 1 s** pour
     charger le code + **≈ 0,45 s** pour préparer la base ;
   - une page ordinaire, serveur déjà démarré : **≈ 4 à 6 ms** ✅.
   → Avec l'offre gratuite, la connexion et le démarrage seraient refusés. Il faut
   l'offre **Workers Paid (5 $/mois, 30 s de calcul)**, ou réduire fortement le démarrage.
6. **Base de données** : le serveur sur Cloudflare doit joindre PostgreSQL. Garder
   Neon (via **Hyperdrive**, gratuit) dans un premier temps ; changer de base
   (D1 = SQLite) demanderait de réécrire 1 281 requêtes → pas maintenant.
7. **Mise en ligne en parallèle** : une adresse d'essai (`*.workers.dev`), tests
   complets, puis seulement après : bascule de `api.moftal.com` et arrêt de Render.

## Rappels

- `main` n'est pas touchée : bug urgent → `git checkout main`, corriger, pousser,
  puis `git checkout migration-cloudflare`.
- Les données des utilisateurs sont dans la base (Neon), pas dans le code :
  changer de branche ne les touche pas. Les essais se font sur une base de test.
- Lancer l'essai : `cd backend && cp wrangler.exemple.toml wrangler.toml`, créer
  `.dev.vars` (DB_HOST, DB_NAME=moftal_essai_cf, DB_USER, DB_PASSWORD, JWT_SECRET de
  test), puis `npx wrangler dev` (PostgreSQL local).
