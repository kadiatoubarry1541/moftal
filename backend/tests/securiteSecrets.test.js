// Secrets : une clé JWT déjà publiée (fichier d'exemple, historique) ou trop
// courte est signalée au démarrage ; une clé longue et inconnue est acceptée.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { problemeCleJwt } from '../src/utils/verifierCleJwt.js';

test('clé JWT : publiée ou trop courte = alerte', async () => {
  const exemple = await readFile(new URL('../config.env.example', import.meta.url), 'utf8');
  const cleExemple = exemple.match(/^JWT_SECRET=(.+)$/m)?.[1]?.trim();
  assert.ok(cleExemple, 'le fichier d’exemple contient une clé JWT');
  assert.match(problemeCleJwt(cleExemple) || '', /déjà publiée/);
  assert.match(problemeCleJwt('trop-courte') || '', /trop courte/);
  assert.equal(problemeCleJwt(randomBytes(48).toString('base64url')), null);
});
