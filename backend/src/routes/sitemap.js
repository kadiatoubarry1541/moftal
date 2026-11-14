import express from 'express';
import { sequelize } from '../config/database.js';
import { FILTRE_GESTION_INTERNE } from './pro-public.js';

// Plan du site pour les moteurs de recherche (annoncé dans robots.txt) :
// pages publiques + site vitrine de chaque établissement visible (même règle
// que la liste publique des établissements). Toujours à jour, sans rien à faire.
const router = express.Router();
const SITE = 'https://moftal.com';

// Type d'établissement → chemin de son site vitrine
// (comme frontend/src/utils/gestionVitrines.ts)
const VITRINE = {
  clinic: 'clinique', school: 'ecole', mosque: 'mosquee', reseau: 'reseau-vitrine', madrasa: 'madrasa',
  commerce: 'commerce', enterprise: 'entreprise', ngo: 'ngo', journalist: 'journaliste', scientist: 'scientifique',
  supplier: 'fournisseur', security_agency: 'securite', broker: 'immobilier', restaurant: 'restaurant',
  transport: 'transport', mairie: 'mairie', vendor: 'vendeur', producer: 'producteur', beauty: 'beaute-vitrine',
  artisan: 'artisan', lawyer: 'juridique-vitrine', legal_advisor: 'juridique-vitrine', imam: 'imam',
};
const PAGES = ['/', '/services', '/professionnels', '/liste-professionnels', '/conditions-utilisation', '/politique-confidentialite'];

const xml = (texte) => String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

router.get('/', async (_req, res) => {
  try {
    const etablissements = await sequelize.query(
      `SELECT mt.tenant_code, mt.type FROM management_tenants mt
       WHERE mt.is_active = true AND mt.tenant_code NOT LIKE 'DEMO-REF-%' AND mt.type IN (:types)
         AND ${FILTRE_GESTION_INTERNE}
       ORDER BY mt.tenant_code`,
      { replacements: { types: Object.keys(VITRINE) }, type: 'SELECT' }
    ).catch(() => []);
    const adresses = [
      ...PAGES.map((p) => `${SITE}${p}`),
      ...etablissements.map((e) => `${SITE}/${VITRINE[e.type]}/${encodeURIComponent(e.tenant_code)}`),
    ];
    res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
      + adresses.map((a) => `  <url><loc>${xml(a)}</loc></url>`).join('\n')
      + '\n</urlset>\n'
    );
  } catch (e) {
    console.error('sitemap:', e.message);
    res.status(500).type('text/plain').send('Plan du site indisponible.');
  }
});

export default router;
