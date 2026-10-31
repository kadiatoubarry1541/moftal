import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// Chaque fichier du serveur doit au moins se lire sans erreur de syntaxe
const src = join(dirname(fileURLToPath(import.meta.url)), '../src');

function fichiersJs(dossier) {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiersJs(chemin);
    return nom.endsWith('.js') ? [chemin] : [];
  });
}

test('aucune erreur de syntaxe dans le serveur', () => {
  const erreurs = [];
  for (const f of fichiersJs(src)) {
    try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
    catch (e) { erreurs.push(`${f}\n${String(e.stderr).split('\n').slice(0, 4).join('\n')}`); }
  }
  assert.deepEqual(erreurs, []);
});
