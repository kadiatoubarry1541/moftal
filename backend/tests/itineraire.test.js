// Itinéraire d'un rendez-vous accepté : seulement le client, consignes en français.
// Le calcul de chemin (OSRM) est remplacé par un faux serveur local.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('itinéraire : client d’un rendez-vous accepté, consignes en français', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  // Faux OSRM : renvoie un trajet de 3 étapes et garde la dernière demande
  let derniereDemande = '';
  const osrm = express();
  osrm.get(/.*/, (req, res) => {
    derniereDemande = req.originalUrl;
    res.json({
      code: 'Ok',
      routes: [{
        distance: 412.4, duration: 300.2,
        geometry: { type: 'LineString', coordinates: [[-13.607, 9.6712], [-13.6065, 9.671], [-13.6061, 9.6705]] },
        legs: [{ steps: [
          { distance: 120, name: 'Route du Niger', maneuver: { type: 'depart', location: [-13.607, 9.6712] } },
          { distance: 250, name: '', maneuver: { type: 'turn', modifier: 'left', location: [-13.6065, 9.671] } },
          { distance: 0, name: '', maneuver: { type: 'arrive', location: [-13.6061, 9.6705] } },
        ] }],
      }],
    });
  });
  const faux = osrm.listen(0);
  process.env.OSRM_URL_PIED = `http://127.0.0.1:${faux.address().port}`;
  process.env.OSRM_URL_VOITURE = `http://127.0.0.1:${faux.address().port}`;

  const client = { numeroH: 'TEST-ITI-CLIENT' };
  let moi = client;
  mock.module(new URL('../src/middleware/auth.js', import.meta.url).href, {
    namedExports: { authenticate: (req, _res, next) => { req.user = moi; req.userId = moi.numeroH; next(); } },
  });
  const { default: router, consigne } = await import('../src/routes/itineraire.js');
  const { default: ProfessionalAccount } = await import('../src/models/ProfessionalAccount.js');
  const { default: Appointment } = await import('../src/models/Appointment.js');
  const { sequelize } = await import('../src/config/database.js');
  await ProfessionalAccount.sync();
  for (const col of ['"latitude" DOUBLE PRECISION', '"longitude" DOUBLE PRECISION', '"repere" TEXT', '"photo_facade" TEXT', '"quartier_gps" VARCHAR(255)', '"position_a_verifier" BOOLEAN DEFAULT false', '"position_le" TIMESTAMPTZ']) {
    await sequelize.query(`ALTER TABLE professional_accounts ADD COLUMN IF NOT EXISTS ${col}`);
  }
  await Appointment.sync();

  const pro = await ProfessionalAccount.create({
    type: 'beauty', name: 'TEST Salon Itinéraire', status: 'approved', isActive: true, subscriptionStatus: 'active',
    ownerNumeroH: 'TEST-ITI-PRO', latitude: 9.6705, longitude: -13.6061, repere: 'Portail bleu',
  });
  const rdv = await Appointment.create({ professionalAccountId: pro.id, patientNumeroH: client.numeroH, patientName: 'Client', type: 'written', status: 'pending' });

  const app = express(); app.use('/api/itineraire', router);
  const serveur = app.listen(0);
  t.after(async () => {
    serveur.close(); faux.close();
    await sequelize.query('DELETE FROM appointments WHERE professional_account_id = :id', { replacements: { id: pro.id } }).catch(() => {});
    await sequelize.query("DELETE FROM professional_accounts WHERE owner_numero_h = 'TEST-ITI-PRO'").catch(() => {});
    await sequelize.close();
  });
  const lire = async (chemin) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api/itineraire${chemin}`);
    return { status: r.status, d: await r.json().catch(() => ({})) };
  };
  const ici = 'lat=9.6712&lng=-13.6070';

  // Pas encore accepté : refusé, et le serveur de chemin n'est même pas appelé
  assert.equal((await lire(`/rendez-vous/${rdv.id}?${ici}`)).status, 403);
  assert.equal(derniereDemande, '');
  await rdv.update({ status: 'accepted' });

  // Position invalide ; autre personne que le client
  assert.equal((await lire(`/rendez-vous/${rdv.id}?lat=abc&lng=1`)).status, 400);
  moi = { numeroH: 'TEST-ITI-AUTRE' };
  assert.equal((await lire(`/rendez-vous/${rdv.id}?${ici}`)).status, 404);
  moi = client;

  // Accepté : trajet à pied, de ma position jusqu'au point du pro
  let r = await lire(`/rendez-vous/${rdv.id}?${ici}&mode=pied`);
  assert.equal(r.status, 200, r.d.message);
  assert.match(derniereDemande, /\/route\/v1\/foot\/-13\.607,9\.6712;-13\.6061,9\.6705/);
  assert.equal(r.d.itineraire.distance, 412);
  assert.equal(r.d.itineraire.trace.length, 3);
  assert.deepEqual(r.d.itineraire.etapes.map((e) => e.consigne), ['Partez sur Route du Niger', 'Tournez à gauche', 'Vous êtes arrivé(e) à destination']);

  // En voiture / moto : profil voiture
  r = await lire(`/rendez-vous/${rdv.id}?${ici}&mode=voiture`);
  assert.match(derniereDemande, /\/route\/v1\/driving\//);

  // Quelques consignes
  assert.equal(consigne({ maneuver: { type: 'roundabout', exit: 2 }, name: 'Avenue de la République' }), 'Au rond-point, prenez la 2e sortie sur Avenue de la République');
  assert.equal(consigne({ maneuver: { type: 'turn', modifier: 'slight right' } }), 'Tournez légèrement à droite');
});
