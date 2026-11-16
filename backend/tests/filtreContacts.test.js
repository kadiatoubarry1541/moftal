// Numéros et e-mails interdits dans les textes publics des pros (règle 5) — sans base.
import test from 'node:test';
import assert from 'node:assert/strict';
import { trouverContact, refusContact } from '../src/utils/filtreContacts.js';

test('détecte numéros et e-mails, pas les prix', () => {
  for (const t of ['Appelez le 620 00 00 01', 'tel: +224 622.43.11.93', 'WhatsApp 625542759', 'salon@gmail.com', '+33 6 12 34 56 78', '00224 621 00 00 00', 'fixe 30 45 12 34']) {
    assert.ok(trouverContact(t), `devrait être détecté : ${t}`);
  }
  for (const t of ['Prix : 600 000 000 FG', 'Riz 290 000 FG le sac', 'Ouvert de 8h à 18h', 'Total 1 250 000 GNF', 'Lot 12345678', 'Promo 30 000 FG', '']) {
    assert.equal(trouverContact(t), null, `ne devrait pas être détecté : ${t}`);
  }
  assert.match(refusContact('Salon', ['Coiffure', 'Tresses : 620000001']), /numéro de téléphone/);
  assert.equal(refusContact('Salon', { services: ['Coiffure'] }, null), null);
});
