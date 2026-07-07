# Plan de tests — Lancement Vendredi 10 Juillet 2026

## Site : https://moftal.com
## GitHub : https://github.com/kadiatoubarry1541/moftal

---

## LUNDI (aujourd'hui) — Sécuriser le code

### ✅ Étape 1 : Pousser les 21 fichiers sur GitHub
→ Dire à Claude "oui pousse tout" pour commiter et pousser

### ✅ Étape 2 : Installer Sentry (30 min)
1. Aller sur https://sentry.io → compte gratuit
2. Créer projet "moftal-backend" (Node.js)
3. Créer projet "moftal-frontend" (React)
4. Ajouter les 3 lignes de code que Claude vous donnera

---

## MARDI — Installer K6 et tester la charge

### ✅ Étape 1 : Installer K6 (5 min)
```
winget install Grafana.k6
```
Redémarrer le terminal, puis vérifier :
```
k6 version
```

### ✅ Étape 2 : Lancer le test de charge
```
cd "C:\Users\koolo barry\Desktop\Les-enfants-d-Adam-main\tests"
k6 run k6-moftal.js
```

### ✅ Résultats attendus (site en bonne santé)
- `http_req_duration p(95)` → moins de 3000ms ✓
- `taux_succes` → plus de 95% ✓
- `erreurs_totales` → proche de 0 ✓

---

## MERCREDI — BugBug (tester les boutons visuellement)

### ✅ Étape 1 : Créer un compte BugBug
1. Aller sur https://bugbug.io → compte gratuit
2. Installer l'extension Chrome BugBug

### ✅ Étape 2 : Enregistrer ces 5 parcours (tests à enregistrer)

**Parcours 1 — Inscription nouvelle famille**
- Aller sur https://moftal.com
- Cliquer sur "S'inscrire"
- Remplir le formulaire
- Vérifier que vous arrivez sur le tableau de bord

**Parcours 2 — Connexion**
- Aller sur https://moftal.com/login
- Entrer email + mot de passe
- Vérifier redirection vers le profil

**Parcours 3 — Arbre généalogique**
- Se connecter
- Aller sur l'arbre
- Ajouter un membre
- Vérifier qu'il apparaît

**Parcours 4 — Espace professionnel**
- Aller sur /inscription-pro
- Remplir le formulaire
- Vérifier la création du compte

**Parcours 5 — Page d'accueil mobile**
- Dans Chrome DevTools → mode mobile (F12 → icône téléphone)
- Vérifier que tout s'affiche correctement

---

## JEUDI — Vérifications finales

### ✅ Checklist avant lancement

**Performance**
- [ ] K6 test passé avec succès (taux_succes > 95%)
- [ ] Temps de réponse < 3 secondes
- [ ] Site accessible sur mobile

**Fonctionnel**
- [ ] Inscription fonctionne
- [ ] Connexion fonctionne
- [ ] Arbre généalogique fonctionne (3+ membres)
- [ ] Espace pro accessible
- [ ] Notifications activées

**Sécurité / Monitoring**
- [ ] Sentry actif (envoie un email test)
- [ ] GitHub à jour (tous les commits poussés)
- [ ] Variables d'environnement en production correctes

---

## VENDREDI — Lancement 🚀

- Garder Sentry ouvert sur votre téléphone
- Si Sentry envoie un email d'erreur → copiez le message et envoyez à Claude
- Profitez de votre lancement ! 10 mois de travail méritent cette fierté.

---

## Outils gratuits utilisés
| Outil | Usage | Lien |
|-------|-------|------|
| K6 | Test de charge (20 utilisateurs simultanés) | k6.io |
| BugBug | Test des boutons et formulaires | bugbug.io |
| Sentry | Surveillance des erreurs en temps réel | sentry.io |
| GitHub | Code versionné et organisé | github.com/kadiatoubarry1541/moftal |
