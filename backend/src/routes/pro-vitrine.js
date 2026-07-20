import express from 'express';
import { authenticate } from '../middleware/auth.js';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import ProPublication from '../models/ProPublication.js';
import { sequelize } from '../../config/database.js';

const router = express.Router();

const MASTER_ADMIN = 'G7C7P7R7E7F7 7';

// G7 peut gérer n'importe quel compte, le propriétaire gère le sien
function canManage(account, userId) {
  return account.ownerNumeroH === userId || userId === MASTER_ADMIN;
}

// ─── COMPTE PAR TENANT CODE (admin ou propriétaire) ──────────────────
// GET /api/pro-vitrine/by-tenant/:tenantCode/account
router.get('/by-tenant/:tenantCode/account', authenticate, async (req, res) => {
  try {
    const account = await ProfessionalAccount.findOne({ where: { tenant_code: req.params.tenantCode } });
    if (!account) return res.status(404).json({ success: false, message: 'Compte non trouvé' });
    if (!canManage(account, req.userId)) return res.status(403).json({ success: false, message: 'Non autorisé' });
    res.json({ success: true, account });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── ENDPOINT PUBLIC PAR TENANT CODE ─────────────────────────────────
// GET /api/pro-vitrine/by-tenant/:tenantCode/publications (pour les vitrines)
router.get('/by-tenant/:tenantCode/publications', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT pp.*
       FROM pro_publications pp
       JOIN professional_accounts pa ON pa.id = pp.professional_account_id
       WHERE pa.tenant_code = :code
         AND pp.is_active = true
       ORDER BY pp.created_at DESC
       LIMIT 30`,
      { replacements: { code: req.params.tenantCode } }
    );
    res.json({ success: true, publications: rows || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── PUBLICATIONS ────────────────────────────────────────────────────

// GET /api/pro-vitrine/:id/publications  (public — clients voient les publications)
router.get('/:id/publications', async (req, res) => {
  try {
    const pubs = await ProPublication.findAll({
      where: { professionalAccountId: req.params.id, isActive: true },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, publications: pubs });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/pro-vitrine/:id/publications  (propriétaire ou G7)
router.post('/:id/publications', authenticate, async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Compte non trouvé' });
    if (!canManage(account, req.userId)) return res.status(403).json({ success: false, message: 'Non autorisé' });

    const { type, titre, contenu, image, video, prix, disponible } = req.body;
    if (!titre?.trim()) return res.status(400).json({ success: false, message: 'Titre requis' });

    const pub = await ProPublication.create({
      professionalAccountId: req.params.id,
      type: type || 'annonce',
      titre: titre.trim(),
      contenu: contenu || '',
      image: image || null,
      video: video || null,
      prix: prix || null,
      disponible: disponible !== false
    });
    res.json({ success: true, publication: pub });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// PUT /api/pro-vitrine/:id/publications/:pubId  (propriétaire ou G7)
router.put('/:id/publications/:pubId', authenticate, async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Compte non trouvé' });
    if (!canManage(account, req.userId)) return res.status(403).json({ success: false, message: 'Non autorisé' });

    const pub = await ProPublication.findByPk(req.params.pubId);
    if (!pub || String(pub.professionalAccountId) !== String(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Publication non trouvée' });
    }

    const { type, titre, contenu, image, video, prix, disponible } = req.body;
    await pub.update({
      type: type !== undefined ? type : pub.type,
      titre: titre?.trim() || pub.titre,
      contenu: contenu !== undefined ? contenu : pub.contenu,
      image: image !== undefined ? image : pub.image,
      video: video !== undefined ? video : pub.video,
      prix: prix !== undefined ? prix : pub.prix,
      disponible: disponible !== undefined ? disponible : pub.disponible
    });
    res.json({ success: true, publication: pub });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /api/pro-vitrine/:id/publications/:pubId  (propriétaire ou G7)
router.delete('/:id/publications/:pubId', authenticate, async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Compte non trouvé' });
    if (!canManage(account, req.userId)) return res.status(403).json({ success: false, message: 'Non autorisé' });

    const pub = await ProPublication.findByPk(req.params.pubId);
    if (!pub || String(pub.professionalAccountId) !== String(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Publication non trouvée' });
    }

    await pub.update({ isActive: false });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── PUBLICATION INFOS VITRINE ────────────────────────────────────────

// PUT /api/pro-vitrine/:id/publish-info  (propriétaire ou G7 — publie sur la vitrine)
router.put('/:id/publish-info', authenticate, async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Compte non trouvé' });
    if (!canManage(account, req.userId)) return res.status(403).json({ success: false, message: 'Non autorisé' });

    const { name, description, address, city, country, phone, email, services, specialties, photo } = req.body;

    await account.update({
      name: name?.trim() || account.name,
      description: description !== undefined ? description : account.description,
      address: address !== undefined ? address : account.address,
      city: city !== undefined ? city : account.city,
      country: country !== undefined ? country : account.country,
      phone: phone !== undefined ? phone : account.phone,
      email: email !== undefined ? email : account.email,
      services: services !== undefined ? services : account.services,
      specialties: specialties !== undefined ? specialties : account.specialties,
      photo: photo !== undefined ? photo : account.photo
    });

    // Auto-créer le tenant_code si le compte n'en a pas encore (tous les types sont couverts)
    let tenantCode = account.tenant_code;
    if (!tenantCode) {
      const prefixMap = { clinic:'CLIN', school:'ECO', enterprise:'ENT', mosque:'MSQ', madrasa:'MDS', commerce:'COM', ngo:'NGO', journalist:'JOUR', scientist:'SCIEN', supplier:'FOUR', security_agency:'SECU', vendor:'VENT', producer:'PROD', broker:'BROK', restaurant:'REST', transport:'TRANS', mairie:'MAIR', beauty:'BEAU', artisan:'ARTIS', immobilier:'IMMO', reseau:'RESEAU' };
      const prefix = prefixMap[account.type] || 'PRO';
      tenantCode = `${prefix}-GN-${String(account.id).padStart(5, '0')}`;
      await account.update({ tenant_code: tenantCode });
      await sequelize.query(
        `INSERT INTO management_tenants (tenant_code, type, name, owner_numero_h) VALUES (:code, :type, :name, :owner) ON CONFLICT (tenant_code) DO NOTHING`,
        { replacements: { code: tenantCode, type: account.type, name: account.name, owner: account.ownerNumeroH } }
      ).catch(() => {});
    }

    // Synchroniser management_tenants pour que la vitrine publique soit à jour
    await sequelize.query(
      `UPDATE management_tenants
       SET name=:name, description=:desc, address=:addr, phone=:phone, email=:email, logo_url=:logo
       WHERE tenant_code=:code`,
      {
        replacements: {
          name: account.name,
          desc: account.description || '',
          addr: account.address || '',
          phone: account.phone || '',
          email: account.email || '',
          logo: account.photo || null,
          code: tenantCode
        }
      }
    ).catch(() => {});

    res.json({ success: true, account, tenantCode });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
