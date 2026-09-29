# Moftal — règles du projet

Règles fixées par la propriétaire du projet. Elles s'appliquent à toute modification.

## 1. Toujours respecter les modèles

Chaque espace professionnel suit exactement son modèle — design et contenu.
On montre uniquement ce que le modèle montre, rien de plus.

- **Le secteur fixe le design** : couleurs, dégradé, icônes (`TYPE_TO_SERVICE` /
  `SERVICE_CONFIG` dans `frontend/src/pages/EspacePro.tsx`). Jamais de design propre à un compte.
- **La formule fixe le contenu** (`planType`) :
  - `visibility` — **Visibilité + Rendez-vous** : pages publiques + rendez-vous.
    Onglets : Demandes · Historique · Paramètres. Pas de gestion interne, pas de
    Moftal Pay / Retrait, pas de Membres / Cours / Mon Menu en onglet, pas d'app installable ni de lien de partage.
  - `full` — **Visibilité + Gestion Interne** : tout, plus site vitrine, tableau de bord,
    gestion, app installée, Moftal Pay.
- Modèles de référence : page admin « Interfaces des dashboards professionnels »
  (section `services` de `frontend/src/pages/AdminDashboard.tsx`) et le choix de formule
  dans `frontend/src/pages/InscriptionPro.tsx`.
- Même secteur + même formule = même page, pour tous les comptes.
- **Gestion Interne = l'application propre du professionnel** : son logo partout
  (`TenantLogo` dans `frontend/src/components/GestionBrand.tsx`), jamais le logo Moftal,
  sauf sur le bouton « Retour sur Moftal » (`MoftalMark` + `goToMoftal`), seul chemin vers le site.
  Le code identifiant de l'établissement n'apparaît que dans Paramètres (`TenantCodeCard`).

## 2. Toujours enregistrer les données dans la base de données

- Toute donnée de l'utilisateur (comptes, profils, documents, invitations, rendez-vous…)
  est enregistrée côté serveur, dans la base. Jamais seulement dans `localStorage`.
- `localStorage` sert uniquement à la session (token, utilisateur connecté), aux préférences
  (thème, langue) et aux brouillons d'un formulaire en cours.
- Si le serveur échoue, on affiche une erreur : jamais de « faux » succès gardé dans le téléphone.
- Jamais de mot de passe en clair dans `localStorage`.
- Un compte créé avec seulement téléphone + mot de passe est un vrai compte en base
  (NuméroH provisoire `TMP-…`) et apparaît dans l'espace admin.
