// Adresse du visiteur : jamais prise dans un en-tête qu'il peut inventer lui-même
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adresseVisiteur } from '../src/utils/cleLimite.js';

const req = (remoteAddress, headers = {}) => ({ socket: { remoteAddress }, headers });

test('un visiteur direct ne peut pas inventer son adresse', () => {
  assert.equal(adresseVisiteur(req('8.8.8.8', { 'cf-connecting-ip': '1.2.3.4', 'true-client-ip': '5.6.7.8', 'x-forwarded-for': '9.9.9.9' })), '8.8.8.8');
});

test('derrière notre relais : la dernière adresse ajoutée par le relais', () => {
  assert.equal(adresseVisiteur(req('172.18.0.5', { 'x-forwarded-for': '1.1.1.1, 41.202.10.20' })), '41.202.10.20');
});

test('CF-Connecting-IP cru seulement quand l\'appel vient vraiment de Cloudflare', () => {
  assert.equal(adresseVisiteur(req('172.18.0.5', { 'x-forwarded-for': '162.158.1.1', 'cf-connecting-ip': '41.202.1.1' })), '41.202.1.1');
  assert.equal(adresseVisiteur(req('::ffff:104.16.0.9', { 'cf-connecting-ip': '41.202.1.1' })), '41.202.1.1');
  assert.equal(adresseVisiteur(req('172.18.0.5', { 'x-forwarded-for': '8.8.4.4', 'cf-connecting-ip': '41.202.1.1' })), '8.8.4.4');
});
