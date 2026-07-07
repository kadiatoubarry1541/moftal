import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// Compteurs personnalisés
const erreurs = new Counter('erreurs_totales');
const tauxSucces = new Rate('taux_succes');

export const options = {
  // Scénario progressif : commence doucement, monte à 20 utilisateurs, puis redescend
  stages: [
    { duration: '30s', target: 5 },   // 0 → 5 utilisateurs en 30 secondes
    { duration: '1m',  target: 20 },  // 5 → 20 utilisateurs en 1 minute
    { duration: '30s', target: 20 },  // 20 utilisateurs pendant 30 secondes (pic)
    { duration: '30s', target: 0 },   // descend à 0
  ],
  thresholds: {
    // Le site doit répondre en moins de 3 secondes pour 95% des requêtes
    http_req_duration: ['p(95)<3000'],
    // Le taux d'erreurs doit rester sous 5%
    taux_succes: ['rate>0.95'],
  },
};

const BASE_URL = 'https://moftal.com';

export default function () {
  // ===== TEST 1 : Page d'accueil =====
  const accueil = http.get(`${BASE_URL}/`);
  const ok1 = check(accueil, {
    'Accueil répond (200)': (r) => r.status === 200 || r.status === 304,
  });
  if (!ok1) erreurs.add(1);
  tauxSucces.add(ok1);

  sleep(1);

  // ===== TEST 2 : API Inscription (simulation) =====
  const emailTest = `testk6_${Math.random().toString(36).substr(2, 8)}@test.com`;
  const inscription = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      email: emailTest,
      password: 'TestK6_2024!',
      nom: 'Test',
      prenom: 'K6',
      telephone: '+224600000000',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const ok2 = check(inscription, {
    'Inscription répond (200 ou 400)': (r) => r.status < 500,
    'Inscription pas une erreur serveur': (r) => r.status !== 500,
  });
  if (!ok2) erreurs.add(1);
  tauxSucces.add(ok2);

  sleep(1);

  // ===== TEST 3 : API Connexion =====
  const connexion = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: 'test@moftal.com',
      password: 'MotDePasseTest123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const ok3 = check(connexion, {
    'Connexion répond (pas erreur 500)': (r) => r.status !== 500,
  });
  if (!ok3) erreurs.add(1);
  tauxSucces.add(ok3);

  sleep(1);

  // ===== TEST 4 : API Vitrines publiques (sans authentification) =====
  const vitrine = http.get(`${BASE_URL}/api/pro-public/clinic/DEMO-REF-CLINIC`);
  const ok4 = check(vitrine, {
    'Vitrine clinique répond': (r) => r.status < 500,
  });
  if (!ok4) erreurs.add(1);
  tauxSucces.add(ok4);

  sleep(1);

  // ===== TEST 5 : API Notifications push (endpoint VAPID) =====
  const notifications = http.get(`${BASE_URL}/api/push/vapid-public-key`);
  const ok5 = check(notifications, {
    'Notifications répond': (r) => r.status < 500,
  });
  if (!ok5) erreurs.add(1);
  tauxSucces.add(ok5);

  sleep(2); // pause entre chaque utilisateur virtuel
}

/*
===== COMMENT LANCER CE TEST =====

1. Installer K6 sur Windows :
   winget install Grafana.k6

2. Aller dans le dossier tests :
   cd "C:\Users\koolo barry\Desktop\Les-enfants-d-Adam-main\tests"

3. Lancer le test :
   k6 run k6-moftal.js

4. Lire les résultats :
   - http_req_duration : temps de réponse moyen (doit être < 3000ms)
   - taux_succes : doit être > 95%
   - erreurs_totales : doit rester proche de 0

===== RÉSULTATS ATTENDUS SI TOUT VA BIEN =====
✓ checks.........................: 95%+ ✓ X / ✗ 0
✓ http_req_duration.............: avg=500ms max=2000ms
✓ taux_succes...................: 100.00%
*/
