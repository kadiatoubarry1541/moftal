// Position de l'établissement : posée par le pro, jamais publique, donnée au client
// d'un rendez-vous accepté, quartier différent signalé à l'admin — base de test.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('position de l’établissement : pro, public, client, admin', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  process.env.JWT_SECRET ||= 'secret-de-test-uniquement';
  const { default: authRouter } = await import('../src/routes/auth.js');
  const { default: proRouter } = await import('../src/routes/professionals.js');
  const { default: rdvRouter } = await import('../src/routes/appointments.js');
  const { default: User } = await import('../src/models/User.js');
  const { default: ProfessionalAccount } = await import('../src/models/ProfessionalAccount.js');
  const { default: Appointment } = await import('../src/models/Appointment.js');
  const { default: Notification } = await import('../src/models/Notification.js');
  const { sequelize } = await import('../src/config/database.js');
  await User.sync();
  await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_valides_depuis TIMESTAMPTZ').catch(() => {});
  await ProfessionalAccount.sync({ alter: false });
  for (const col of [
    'ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION', 'ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION',
    'ADD COLUMN IF NOT EXISTS "repere" TEXT', 'ADD COLUMN IF NOT EXISTS "photo_facade" TEXT',
    'ADD COLUMN IF NOT EXISTS "quartier_gps" VARCHAR(255)', 'ADD COLUMN IF NOT EXISTS "position_a_verifier" BOOLEAN DEFAULT false',
    'ADD COLUMN IF NOT EXISTS "position_le" TIMESTAMPTZ',
  ]) await sequelize.query(`ALTER TABLE professional_accounts ${col}`);
  await Appointment.sync();
  await Notification.sync();

  const base = String(Date.now()).slice(-6);
  const tels = { pro: `621${base}`, client: `622${base}`, admin: `623${base}` };
  const app = express(); app.use(express.json({ limit: '5mb' }));
  app.use('/api/auth', authRouter); app.use('/api/professionals', proRouter); app.use('/api/appointments', rdvRouter);
  const serveur = app.listen(0);
  const numeros = {};
  t.after(async () => {
    serveur.close();
    const liste = Object.values(numeros);
    await sequelize.query('DELETE FROM appointments WHERE patient_numero_h IN (:l)', { replacements: { l: liste } }).catch(() => {});
    await sequelize.query('DELETE FROM notifications WHERE recipient_numero_h IN (:l)', { replacements: { l: liste } }).catch(() => {});
    await sequelize.query('DELETE FROM professional_accounts WHERE owner_numero_h IN (:l)', { replacements: { l: liste } }).catch(() => {});
    await sequelize.query('DELETE FROM sessions_appareils WHERE numero_h IN (:l)', { replacements: { l: liste } }).catch(() => {});
    await sequelize.query('DELETE FROM users WHERE tel1 IN (:l)', { replacements: { l: Object.values(tels) } }).catch(() => {});
    await sequelize.close();
  });
  const appel = async (methode, chemin, { jeton, corps } = {}) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api${chemin}`, {
      method: methode,
      headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  };

  const jetons = {};
  for (const [qui, tel] of Object.entries(tels)) {
    const r = await appel('POST', '/auth/register-quick', { corps: { telephone: tel, password: 'motdepasse1' } });
    assert.equal(r.status, 201, r.d.message);
    jetons[qui] = r.d.token;
    numeros[qui] = r.d.user.numeroH;
  }
  await User.update({ role: 'admin' }, { where: { numeroH: numeros.admin } });

  const commun = { status: 'approved', isActive: true, subscriptionStatus: 'active' };
  const salon = await ProfessionalAccount.create({ ...commun, type: 'beauty', name: `TEST Salon Position ${base}`, ownerNumeroH: numeros.pro, address: 'Kipé, en face du marché', city: 'Ratoma' });
  // L'admin possède aussi un établissement approuvé (son NuméroH est provisoire dans ce test)
  await ProfessionalAccount.create({ ...commun, type: 'beauty', name: `TEST Admin Position ${base}`, ownerNumeroH: numeros.admin });

  const position = { latitude: 9.6705, longitude: -13.6061, repere: 'Portail bleu en face du marché de Kipé' };

  // Refus : un autre que le propriétaire, position invalide, sans repère
  assert.equal((await appel('PUT', `/professionals/${salon.id}/position`, { jeton: jetons.client, corps: position })).status, 403);
  assert.equal((await appel('PUT', `/professionals/${salon.id}/position`, { jeton: jetons.pro, corps: { ...position, latitude: 'x' } })).status, 400);
  assert.equal((await appel('PUT', `/professionals/${salon.id}/position`, { jeton: jetons.pro, corps: { ...position, repere: '' } })).status, 400);

  // Quartier GPS = adresse déclarée : pas de vérification
  let r = await appel('PUT', `/professionals/${salon.id}/position`, { jeton: jetons.pro, corps: { ...position, quartierGps: 'Kipé' } });
  assert.equal(r.status, 200, r.d.message);
  assert.equal(r.d.aVerifier, false);

  // Jamais publique : ni dans la fiche, ni dans la liste
  r = await appel('GET', `/professionals/detail/${salon.id}`);
  assert.equal(r.d.account.latitude, undefined);
  assert.equal(r.d.account.repere, undefined);
  r = await appel('GET', '/professionals/approved?type=beauty');
  assert.equal(r.d.accounts.find((a) => a.id === salon.id)?.longitude, undefined);

  // Client : rien tant que le rendez-vous n'est pas accepté, puis le point, le repère
  const rdv = await Appointment.create({ professionalAccountId: salon.id, patientNumeroH: numeros.client, patientName: 'Client', type: 'written', status: 'pending' });
  r = await appel('GET', '/appointments/my-appointments', { jeton: jetons.client });
  assert.equal(r.d.appointments.find((a) => a.id === rdv.id).professional.position, undefined);
  await rdv.update({ status: 'accepted' });
  r = await appel('GET', '/appointments/my-appointments', { jeton: jetons.client });
  const pos = r.d.appointments.find((a) => a.id === rdv.id).professional.position;
  assert.equal(pos.latitude, position.latitude);
  assert.equal(pos.repere, position.repere);

  // Quartier GPS différent : signalé à l'admin
  r = await appel('PUT', `/professionals/${salon.id}/position`, { jeton: jetons.pro, corps: { ...position, quartierGps: 'Matoto' } });
  assert.equal(r.d.aVerifier, true);
  assert.ok(await Notification.findOne({ where: { recipientNumeroH: numeros.admin } }), 'admin prévenu');
  r = await appel('GET', '/professionals/admin/positions-a-verifier', { jeton: jetons.admin });
  assert.equal(r.status, 200, r.d.message);
  assert.ok(r.d.comptes.some((c) => c.id === salon.id));
  assert.equal((await appel('GET', '/professionals/admin/positions-a-verifier', { jeton: jetons.client })).status, 403);
  r = await appel('PUT', `/professionals/admin/${salon.id}/position-verifiee`, { jeton: jetons.admin });
  assert.equal(r.status, 200, r.d.message);
  await salon.reload();
  assert.equal(salon.positionAVerifier, false);
});
