# Suivi des améliorations Moftal

Liste issue de l'analyse du projet. Un point marqué ✅ est terminé, poussé et
fusionné dans `main` : on n'y revient pas. ⏸️ = mis de côté, on y reviendra.

| # | Point | État |
|---|---|---|
| 1 | Sauvegarde des données (base Neon) | ⏸️ **À reprendre.** Code fait et fusionné (sauvegarde chiffrée et vérifiée chaque nuit, photos sorties de Neon). Reste à ajouter les secrets GitHub : voir `docs/SAUVEGARDE_ET_RESTAURATION.md` |
| 2 | Tests lancés avant toute mise en ligne | ✅ Terminé — tests (serveur + site) obligatoires avant la mise en ligne ; Render réglé sur « After CI Checks Pass » |
| 3 | Paiements Djomy | ✅ Terminé — tests (signature, double crédit, montant), paiements refusés marqués « échoués », mode réel/test visible dans le diagnostic admin. À vérifier sur Render : `DJOMY_ENV=production` |
| 4 | Connexion : appareils connectés et déconnexion à distance | 🔧 En cours |
| 5 | Favoris des Services gardés seulement sur le téléphone | À faire |
| 6 | Brouillon de déclaration d'un défunt | À faire |
| 7 | Wallet Pro « Bientôt disponible » | À faire |
| 8 | Événements du lieu de résidence | À faire |
| 9 | Développement : soumissions pas ouvertes | À faire |
| 10 | Inscription fournisseur incomplète | À faire |
| 11 | Serveur trop gros, base corrigée au démarrage | À faire |
| 12 | Aucune surveillance des erreurs | À faire |
| 13 | Réveil de la base toutes les 4 minutes (coût Neon) | À faire |
| 14 | Fichiers en vrac à la racine du projet | À faire |
| 15 | Pas de `sitemap.xml` | À faire |
