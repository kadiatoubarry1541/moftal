# ✅ Checklist de test – tout doit rester rapide

## Avant de tester
1. **Démarrer le projet** : à la racine, `npm run start:both`
2. **Attendre** : message « PostgreSQL connecté » et « Serveur démarré » (et éventuellement « Modèles synchronisés »)
3. **Ouvrir** : http://localhost:3000 (ou le port indiqué par Vite)

---

## 1. Création de compte (ne doit jamais être lente)
- Aller sur **Inscription** → choisir **Par vidéo** ou **Par écrit**
- Remplir le formulaire et **Envoyer**
- **Attendu** : réponse en **moins de 2 secondes** (souvent < 1 s)
- Si message « Le serveur met trop de temps à répondre » : la requête a été limitée à 25 s, ne pas attendre plus

## 2. Connexion
- **Connexion** avec NumeroH + mot de passe (ex. compte test ou admin)
- **Attendu** : connexion en **moins de 2 secondes**

## 3. Liens (couple, parent–enfant)
- **Partenaire (Mon Homme / Ma Femme)** : envoyer une demande → l’autre accepte ou **Refuser** → vérifier « Demandes que j’ai envoyées » (En attente / Refusé)
- **Parents** : parent ajoute un enfant → l’enfant **Confirmer** ou **Refuser** → le parent voit le statut dans **Mes Enfants**
- **Enfants** : voir « Demandes envoyées » avec statut (En attente / Refusé - Désolé)

## 4. Admin
- Connexion avec le compte admin (ex. `G0C0P0R0E0F0 0`)
- **Administration** → **Gestion Utilisateurs** : la liste doit se charger **sans rester bloquée**

---

## Si quelque chose est lent ou bloque
- Vérifier que **PostgreSQL** tourne et que `backend/config.env` est correct (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
- Vérifier la **console du backend** : erreurs ou timeouts
- En production (Render) : vérifier **ADMIN_PASSWORD** et **DATABASE_URL** (ou DB_*) dans les variables d’environnement

Tout est configuré pour que la base et le serveur ne soient pas lents : index en base, réponse immédiate à l’inscription, timeout 25 s, pool DB optimisé, recherche utilisateur en 1–2 requêtes.
