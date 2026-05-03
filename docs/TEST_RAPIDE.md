# Checklist de test

## Avant de tester en local

1. **Démarrer le backend** : `cd backend && npm run dev` (Wrangler sur port 8787)
2. **Démarrer le frontend** : `cd frontend && npm run dev` (Vite sur port 3000)
3. **Ouvrir** : http://localhost:3000

---

## 1. Création de compte
- Aller sur **Inscription** → choisir **Par vidéo** ou **Par écrit**
- Remplir le formulaire et **Envoyer**
- **Attendu** : réponse en moins de 2 secondes

## 2. Connexion
- **Connexion** avec NumeroH + mot de passe
- Note : taper uniquement des chiffres **0** (pas la lettre O) dans le NumeroH
- **Attendu** : connexion en moins de 2 secondes

## 3. Admin
- NumeroH admin : `G0C0P0R0E0F0 0` (tous des zéros, pas des lettres O)
- Mot de passe admin défini dans `wrangler.toml` ou via `wrangler secret put ADMIN_PASSWORD`

---

## Si quelque chose ne fonctionne pas
- Vérifier que `wrangler dev` tourne bien sur le port 8787
- Vérifier la console du terminal backend pour les erreurs
- En production (Cloudflare) : vérifier les secrets via `wrangler secret list`
