# Suivi des améliorations Moftal

Liste issue de l'analyse du projet. Un point marqué ✅ est terminé, poussé et
fusionné dans `main` : on n'y revient pas. ⏸️ = mis de côté, on y reviendra.

| # | Point | État |
|---|---|---|
| 1 | Sauvegarde des données (base Neon) | ⏸️ **À reprendre.** Code fait et fusionné (sauvegarde chiffrée et vérifiée chaque nuit, photos sorties de Neon). Reste à ajouter les secrets GitHub : voir `docs/SAUVEGARDE_ET_RESTAURATION.md` |
| 2 | Tests lancés avant toute mise en ligne | ✅ Terminé — tests (serveur + site) obligatoires avant la mise en ligne ; Render réglé sur « After CI Checks Pass » |
| 3 | Paiements Djomy | ✅ Terminé — tests (signature, double crédit, montant), paiements refusés marqués « échoués », mode réel/test visible dans le diagnostic admin. À vérifier sur Render : `DJOMY_ENV=production` |
| 4 | Connexion : appareils connectés et déconnexion à distance | ✅ Terminé — liste « Mes appareils connectés » (page Identité), déconnecter un appareil ou tous les autres à distance ; changement / oubli de mot de passe et « Se déconnecter » ferment aussi les sessions |
| 5 | Favoris des Services gardés seulement sur le téléphone | ✅ Terminé — enregistrés en base, retrouvés sur tous les appareils ; ceux qu'un ancien téléphone gardait sont repris une fois puis effacés du téléphone ; échec d'enregistrement = message, jamais de faux succès |
| 6 | Déclaration d'un défunt | ✅ Terminé — vrai brouillon (retrouvé si la page se recharge, effacé une fois le défunt enregistré) ; plus de mot de passe ni de fausse adresse e-mail envoyés pour un défunt (aucun compte n'est créé) ; le lien de parenté d'une déclaration n'est plus réutilisé par erreur pour la suivante |
| 7 | Moftal Pay Pro pour tous les secteurs | ✅ Terminé — ouvert à tous les secteurs en formule Visibilité + Gestion Interne (dépôts, paiements, retraits) ; règle « 1 an d'ancienneté avant un retrait » réparée (elle ne bloquait jamais rien) |
| 8 | Événements du quartier | ✅ Terminé — « Je participe » sur les messages Fête / Réunion / Rencontre / Mariage / Baptême de la discussion du quartier, enregistré en base avec le nombre de participants ; anciennes pages « Lieu de résidence 1-3 » (sans lien, publications toujours vides) retirées |
| 9 | Développement : soumissions pas ouvertes | 🔧 Prochain (choix : le construire) |
| 10 | Inscription fournisseur incomplète | À faire (choix : ouvrir à tous les secteurs) |
| 11 | Serveur trop gros, base corrigée au démarrage | À faire |
| 12 | Aucune surveillance des erreurs | À faire |
| 13 | Réveil de la base toutes les 4 minutes (coût Neon) | À faire |
| 14 | Fichiers en vrac à la racine du projet | À faire |
| 15 | Pas de `sitemap.xml` | À faire |
