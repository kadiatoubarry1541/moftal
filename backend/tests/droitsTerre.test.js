// Droits de publier dans Terre ADAM : habitants de 25 ans et plus dans leur quartier.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ageDe, habiteLeQuartier, peutPublierCommeAncien } from '../src/utils/droitsTerre.js';

const ilYa = (ans, jours = 0) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - ans);
  d.setDate(d.getDate() + jours);
  return d.toISOString().slice(0, 10);
};

test('âge : date de naissance, sinon âge enregistré', () => {
  assert.equal(ageDe({ dateNaissance: ilYa(40) }), 40);
  assert.equal(ageDe({ dateNaissance: ilYa(40, 1) }), 39); // anniversaire demain
  assert.equal(ageDe({ age: 52 }), 52);
  assert.equal(ageDe({}), null);
});

test('quartier : l\'une des résidences, sans tenir compte des majuscules', () => {
  const u = { lieu1: 'Tata', lieuResidence2: ' Boulbinet ' };
  assert.equal(habiteLeQuartier(u, 'tata'), true);
  assert.equal(habiteLeQuartier(u, 'boulbinet'), true);
  assert.equal(habiteLeQuartier(u, 'daka'), false);
  assert.equal(habiteLeQuartier({ lieu1: 'Non spécifié' }, 'non spécifié'), false);
});

test('25 ans ou plus, dans son quartier seulement', () => {
  const ancien = { dateNaissance: ilYa(25), lieu1: 'Tata' };
  assert.equal(peutPublierCommeAncien(ancien, 'quartier', 'tata'), true);
  assert.equal(peutPublierCommeAncien(ancien, 'quartier', 'daka'), false);
  assert.equal(peutPublierCommeAncien(ancien, 'sous-prefecture', 'tata'), false);
  assert.equal(peutPublierCommeAncien({ dateNaissance: ilYa(24), lieu1: 'Tata' }, 'quartier', 'tata'), false);
  assert.equal(peutPublierCommeAncien({ lieu1: 'Tata' }, 'quartier', 'tata'), false); // âge inconnu
});

test('journaliste avec un compte pro : peut publier, sauf compte refusé', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  const { estJournalistePro } = await import('../src/utils/droitsTerre.js');
  const { default: ProfessionalAccount } = await import('../src/models/ProfessionalAccount.js');
  const { sequelize } = await import('../src/config/database.js');
  await ProfessionalAccount.sync();
  t.after(async () => {
    await sequelize.query("DELETE FROM professional_accounts WHERE owner_numero_h LIKE 'TEST-DROITS-TERRE%'").catch(() => {});
    await sequelize.close();
  });
  await ProfessionalAccount.create({ type: 'journalist', name: 'TEST Journal', ownerNumeroH: 'TEST-DROITS-TERRE-1', status: 'pending' });
  await ProfessionalAccount.create({ type: 'journalist', name: 'TEST Journal refusé', ownerNumeroH: 'TEST-DROITS-TERRE-2', status: 'rejected' });
  await ProfessionalAccount.create({ type: 'clinic', name: 'TEST Clinique', ownerNumeroH: 'TEST-DROITS-TERRE-3', status: 'approved' });
  assert.equal(await estJournalistePro('TEST-DROITS-TERRE-1'), true);  // pas besoin d'attendre la validation
  assert.equal(await estJournalistePro('TEST-DROITS-TERRE-2'), false); // refusé
  assert.equal(await estJournalistePro('TEST-DROITS-TERRE-3'), false); // pas journaliste
});
