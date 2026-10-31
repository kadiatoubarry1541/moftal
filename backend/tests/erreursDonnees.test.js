import test from 'node:test';
import assert from 'node:assert/strict';
import { erreursDonnees, estMessageTechnique } from '../src/middleware/erreursDonnees.js';

// Simule une réponse Express : renvoie ce que la route aurait envoyé au téléphone
function repondre(statut, corps) {
  let envoye = null;
  const res = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(b) { envoye = { statut: this.statusCode, corps: b }; return this; },
  };
  const erreurConsole = console.error;
  console.error = () => {};
  try {
    erreursDonnees({ method: 'GET', originalUrl: '/api/test' }, res, () => {});
    res.status(statut).json(corps);
  } finally {
    console.error = erreurConsole;
  }
  return envoye;
}

test('une panne de la base devient « Erreur serveur »', () => {
  const r = repondre(500, { success: false, message: 'relation "commerce_reviews" does not exist' });
  assert.equal(r.statut, 500);
  assert.deepEqual(r.corps, { success: false, message: 'Erreur serveur' });
});

test('une erreur de code devient « Erreur serveur »', () => {
  const r = repondre(500, { message: "Cannot read properties of undefined (reading 'id')" });
  assert.equal(r.corps.message, 'Erreur serveur');
});

test('un message écrit en français pour l’utilisateur reste tel quel', () => {
  const r = repondre(500, { success: false, message: 'Erreur serveur lors de la récupération des statistiques' });
  assert.equal(r.corps.message, 'Erreur serveur lors de la récupération des statistiques');
});

test('un doublon reste un refus clair (400)', () => {
  const r = repondre(500, { success: false, message: 'duplicate key value violates unique constraint "x"' });
  assert.equal(r.statut, 400);
  assert.equal(r.corps.message, 'Cet élément existe déjà.');
});

test('les refus (4xx) ne sont pas touchés', () => {
  const r = repondre(404, { success: false, message: 'Introuvable' });
  assert.deepEqual(r.corps, { success: false, message: 'Introuvable' });
});

test('détection des messages techniques', () => {
  assert.equal(estMessageTechnique('connect ECONNREFUSED 127.0.0.1:5432'), true);
  assert.equal(estMessageTechnique('Solde insuffisant'), false);
  assert.equal(estMessageTechnique('Données invalides'), false);
});
