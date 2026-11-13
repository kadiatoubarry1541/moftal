# Sauvegarde et restauration des données Moftal

Objectif : **ne jamais perdre une donnée**, même si Neon, un compte ou un serveur disparaît.

## Les 3 protections

| Protection | Ce qu'elle couvre | Où |
|---|---|---|
| **Historique Neon** (plan payant) | Retour en arrière à une minute près, sur la durée de l'historique de votre plan | Console Neon → *Restore* |
| **Sauvegarde de chaque nuit** | Copie complète de chaque base, chiffrée, vérifiée, 35 jours + 1 par mois pendant 1 an | IDrive (`sauvegardes-base/…`), et R2 si configuré |
| **Fichiers** (photos, vidéos, PDF) | Envoyés sur ImageKit / R2, copie de secours sur IDrive | La base ne garde que le lien |

L'historique Neon protège contre une erreur récente (données effacées par erreur).
La sauvegarde de chaque nuit protège contre tout le reste (compte Neon perdu ou suspendu,
facture impayée, panne, piratage), car elle est **hors de Neon**.

## Mise en place (une seule fois)

Dans GitHub : dépôt → **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Valeur |
|---|---|
| `NEON_DATABASE_URL` | Adresse de la base principale (console Neon → *Connect*, la même que `DATABASE_URL` sur Render) |
| `NEON_DATABASE_URL_PRO`, `NEON_DATABASE_URL_IA`, `NEON_DATABASE_URL_TEMPS` | Seulement si `DATABASE_URL_PRO` / `_IA` / `_TEMPS` existent sur Render (bases séparées) |
| `SAUVEGARDE_CLE` | Un long mot de passe inventé (20 caractères ou plus) qui chiffre les copies |
| `IDRIVE_ACCESS_KEY`, `IDRIVE_SECRET_KEY`, `IDRIVE_ENDPOINT`, `IDRIVE_REGION`, `IDRIVE_BUCKET` | Les mêmes valeurs que sur Render |
| *(facultatif)* `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_SAUVEGARDES` | Pour une 2e copie sur Cloudflare R2 : créez un seau **privé** dédié (jamais `moftal-storage`, qui est public) |

⚠️ **Notez `SAUVEGARDE_CLE` ailleurs que dans GitHub** (papier rangé, gestionnaire de mots de passe).
Sans elle, les copies chiffrées ne peuvent pas être ouvertes.

Puis : onglet **Actions → « Sauvegarde de la base (chaque nuit) » → Run workflow** pour faire
une première sauvegarde tout de suite et vérifier qu'elle est verte ✅.

## Chaque jour

Rien à faire. La sauvegarde tourne chaque nuit à 02:17 (heure de Conakry).
Si elle échoue, GitHub vous envoie un e-mail : il faut alors regarder l'onglet **Actions**.

## Restaurer (en cas de problème)

1. **Erreur récente** (données effacées depuis peu) : console Neon → *Restore* → choisir l'heure
   juste avant le problème. C'est le plus rapide.
2. **Sinon**, à partir d'une sauvegarde de la nuit :
   1. Télécharger le fichier voulu depuis IDrive : `sauvegardes-base/principale/quotidien/AAAA-MM-JJ-HHMM.dump.gpg`.
   2. Créer une base **vide** (par exemple une nouvelle branche ou un nouveau projet Neon).
   3. Lancer :
      ```bash
      SAUVEGARDE_CLE='votre mot de passe' ./scripts/sauvegarde/restaurer-base.sh fichier.dump.gpg 'postgresql://…base-vide…'
      ```
      Le script refuse d'écrire dans une base qui contient déjà des tables.
   4. Vérifier les données, puis mettre la nouvelle adresse dans `DATABASE_URL` sur Render.
