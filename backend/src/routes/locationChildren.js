import express from 'express';
import { authenticate } from '../middleware/auth.js';
import LocationChild from '../models/LocationChild.js';

// Liste des lieux "enfants" d'un lieu (quartiers d'une sous-préfecture,
// sous-préfectures d'une préfecture, préfectures d'une région...).
// Gérée par les admins/journalistes, visible par tous.

const router = express.Router();
router.use(authenticate);

const isJournalistOrAdmin = (user) =>
  user.isMasterAdmin ||
  user.role === 'admin' ||
  user.role === 'super-admin' ||
  user.role === 'journalist' ||
  user.isJournalist === true;

// GET /api/location-children?scope=&location=
router.get('/', async (req, res) => {
  try {
    const { scope, location } = req.query;
    if (!scope || !location) {
      return res.status(400).json({ success: false, message: 'scope et location requis.' });
    }
    const children = await LocationChild.findAll({
      where: { parentScope: scope, parentLocation: String(location).toLowerCase() },
      order: [['name', 'ASC']]
    });
    res.json({ success: true, children });
  } catch (err) {
    console.error('location-children GET:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/location-children — admin/journaliste uniquement
router.post('/', async (req, res) => {
  try {
    if (!isJournalistOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Réservé aux administrateurs/journalistes.' });
    }
    const { scope, location, name } = req.body;
    if (!scope || !location || !name?.trim()) {
      return res.status(400).json({ success: false, message: 'scope, location et name requis.' });
    }
    const child = await LocationChild.create({
      parentScope: scope,
      parentLocation: String(location).toLowerCase(),
      name: name.trim(),
      addedByNumeroH: req.user.numeroH
    });
    res.json({ success: true, child });
  } catch (err) {
    console.error('location-children POST:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// DELETE /api/location-children/:id — admin/journaliste uniquement
router.delete('/:id', async (req, res) => {
  try {
    if (!isJournalistOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Réservé aux administrateurs/journalistes.' });
    }
    await LocationChild.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('location-children DELETE:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;
