// Rendez-vous accepté : le client reçoit les contacts du pro — base PostgreSQL de test.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('rendez-vous : contacts du pro seulement après acceptation', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  const client = { numeroH: 'TEST-RDV-CLIENT', prenom: 'Awa', nomFamille: 'Test', role: 'user' };
  const pro = { numeroH: 'TEST-RDV-PRO', role: 'user' };
  let moi = client;
  mock.module(new URL('../src/middleware/auth.js', import.meta.url).href, {
    namedExports: { authenticate: (req, _res, next) => { req.user = moi; req.userId = moi.numeroH; next(); } },
  });
  mock.module(new URL('../src/services/emailService.js', import.meta.url).href, {
    namedExports: { sendAppointmentAcceptedEmail: async () => {}, sendAppointmentRejectedEmail: async () => {} },
  });
  const { default: router } = await import('../src/routes/appointments.js');
  const { default: ProfessionalAccount } = await import('../src/models/ProfessionalAccount.js');
  const { default: Appointment } = await import('../src/models/Appointment.js');
  const { default: Notification } = await import('../src/models/Notification.js');
  const { sequelize } = await import('../src/config/database.js');
  await ProfessionalAccount.sync();
  await Appointment.sync();
  await Notification.sync();

  const compte = await ProfessionalAccount.create({
    type: 'beauty', name: 'TEST Salon RDV', status: 'approved', isActive: true, subscriptionStatus: 'active',
    ownerNumeroH: pro.numeroH, phone: '620000003', email: 'salon@exemple.test', address: 'Kipé, portail bleu', city: 'Conakry',
  });

  const app = express(); app.use(express.json()); app.use('/api/appointments', router);
  const serveur = app.listen(0);
  t.after(async () => {
    serveur.close();
    await sequelize.query("DELETE FROM notifications WHERE recipient_numero_h IN ('TEST-RDV-CLIENT', 'TEST-RDV-PRO')").catch(() => {});
    await sequelize.query('DELETE FROM appointments WHERE professional_account_id = :id', { replacements: { id: compte.id } }).catch(() => {});
    await sequelize.query("DELETE FROM professional_accounts WHERE owner_numero_h = 'TEST-RDV-PRO'").catch(() => {});
    await sequelize.close();
  });
  const appel = async (methode, chemin, corps) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api/appointments${chemin}`, {
      method: methode, headers: { 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined,
    });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  };

  // Demande : en attente, pas de contacts
  let r = await appel('POST', '/book', { professionalAccountId: compte.id, type: 'written', appointmentDate: '2030-01-10', appointmentTime: '10:00', service: 'Coiffure' });
  assert.equal(r.status, 201, r.d.message);
  const id = r.d.appointment.id;
  r = await appel('GET', '/my-appointments');
  let rdv = r.d.appointments.find((a) => a.id === id);
  assert.equal(rdv.professional.phone, undefined, 'pas de téléphone avant acceptation');
  assert.equal(rdv.professional.email, undefined);

  // Le pro accepte → le client voit téléphone, e-mail et adresse
  moi = pro;
  assert.equal((await appel('POST', `/accept/${id}`, {})).status, 200);
  moi = client;
  r = await appel('GET', '/my-appointments');
  rdv = r.d.appointments.find((a) => a.id === id);
  assert.equal(rdv.professional.phone, '620000003');
  assert.equal(rdv.professional.email, 'salon@exemple.test');
  assert.equal(rdv.professional.address, 'Kipé, portail bleu');

  // La notification « Rendez-vous accepté » contient les contacts (enregistrée en base)
  const notif = await Notification.findOne({ where: { recipientNumeroH: client.numeroH, type: 'appointment_accepted', relatedId: id } });
  assert.ok(notif, 'notification enregistrée');
  assert.match(notif.message, /620000003/);
  assert.match(notif.message, /salon@exemple\.test/);
});
