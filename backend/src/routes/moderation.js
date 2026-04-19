import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { analyzeImagesBatch } from '../services/moderationService.js';
import User from '../models/User.js';
import FamilyGallery from '../models/FamilyGallery.js';
import FamilyProblemMedia from '../models/FamilyProblemMedia.js';

const router = express.Router();

// Toutes les routes nécessitent auth + admin
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/moderation/scan
 * Lance un scan IA de toutes les images du site et retourne les images suspectes.
 * Query params:
 *   - sources: comma-separated list (gallery,users,problems) - défaut: tous
 */
router.get('/scan', async (req, res) => {
  try {
    const sources = req.query.sources
      ? req.query.sources.split(',')
      : ['gallery', 'users', 'problems'];

    const imagesToScan = [];

    // ── 1. Galerie familiale partagée ──────────────────────────────────────
    if (sources.includes('gallery')) {
      const galleryItems = await FamilyGallery.findAll({
        where: { type: 'image' }
      });

      for (const item of galleryItems) {
        if (item.url) {
          imagesToScan.push({
            imageData: item.url,
            source: 'family_gallery',
            deleteId: item.id,
            uploaderNumeroH: item.uploaderNumeroH,
            uploaderName: item.uploaderName,
            familyName: item.familyName,
            album: item.album,
            label: `Galerie famille "${item.familyName}" — album ${item.album}`
          });
        }
      }
    }

    // ── 2. Photos profils et photos de famille des utilisateurs ───────────
    if (sources.includes('users')) {
      const users = await User.findAll({
        attributes: [
          'numeroH', 'prenom', 'nomFamille',
          'photo', 'familyPhoto', 'manPhoto', 'wifePhoto',
          'childrenPhotos', 'galleryAlbums'
        ]
      });

      for (const user of users) {
        const name = `${user.prenom} ${user.nomFamille}`;

        if (user.photo) {
          imagesToScan.push({
            imageData: user.photo,
            source: 'user_photo',
            deleteId: user.numeroH,
            field: 'photo',
            uploaderNumeroH: user.numeroH,
            uploaderName: name,
            label: `Photo de profil de ${name}`
          });
        }

        if (user.familyPhoto) {
          imagesToScan.push({
            imageData: user.familyPhoto,
            source: 'user_field',
            deleteId: user.numeroH,
            field: 'familyPhoto',
            uploaderNumeroH: user.numeroH,
            uploaderName: name,
            label: `Photo de famille de ${name}`
          });
        }

        if (user.manPhoto) {
          imagesToScan.push({
            imageData: user.manPhoto,
            source: 'user_field',
            deleteId: user.numeroH,
            field: 'manPhoto',
            uploaderNumeroH: user.numeroH,
            uploaderName: name,
            label: `Photo mari de ${name}`
          });
        }

        if (user.wifePhoto) {
          imagesToScan.push({
            imageData: user.wifePhoto,
            source: 'user_field',
            deleteId: user.numeroH,
            field: 'wifePhoto',
            uploaderNumeroH: user.numeroH,
            uploaderName: name,
            label: `Photo femme de ${name}`
          });
        }

        // Photos enfants (tableau JSON)
        if (user.childrenPhotos) {
          try {
            const children = JSON.parse(user.childrenPhotos);
            if (Array.isArray(children)) {
              children.forEach((childPhoto, index) => {
                if (childPhoto) {
                  imagesToScan.push({
                    imageData: childPhoto,
                    source: 'user_children',
                    deleteId: user.numeroH,
                    field: 'childrenPhotos',
                    index,
                    uploaderNumeroH: user.numeroH,
                    uploaderName: name,
                    label: `Photo enfant #${index + 1} de ${name}`
                  });
                }
              });
            }
          } catch (_) { /* JSON invalide, on ignore */ }
        }

        // Albums galerie privée (JSON objet)
        if (user.galleryAlbums) {
          try {
            const albums = JSON.parse(user.galleryAlbums);
            for (const [albumName, photos] of Object.entries(albums)) {
              if (Array.isArray(photos)) {
                photos.forEach((photo, index) => {
                  if (photo) {
                    imagesToScan.push({
                      imageData: photo,
                      source: 'user_album',
                      deleteId: user.numeroH,
                      field: 'galleryAlbums',
                      album: albumName,
                      index,
                      uploaderNumeroH: user.numeroH,
                      uploaderName: name,
                      label: `Album "${albumName}" photo #${index + 1} de ${name}`
                    });
                  }
                });
              }
            }
          } catch (_) { /* JSON invalide, on ignore */ }
        }
      }
    }

    // ── 3. Médias problèmes de santé familiaux ────────────────────────────
    if (sources.includes('problems')) {
      const problemMedia = await FamilyProblemMedia.findAll({
        where: { mediaType: 'image' }
      });

      for (const item of problemMedia) {
        if (item.mediaUrl) {
          imagesToScan.push({
            imageData: item.mediaUrl,
            source: 'problem_media',
            deleteId: item.id,
            uploaderNumeroH: item.numeroH,
            uploaderName: item.authorName,
            familyName: item.familyName,
            label: `Média santé famille "${item.familyName}" par ${item.authorName}`
          });
        }
      }
    }

    const total = imagesToScan.length;

    if (total === 0) {
      return res.json({
        success: true,
        total: 0,
        scanned: 0,
        flaggedCount: 0,
        flagged: []
      });
    }

    // Analyse IA par lots de 3 images simultanées
    const results = await analyzeImagesBatch(imagesToScan, 3);
    const flagged = results.filter(r => r.isNSFW);

    // Ne pas renvoyer le champ imageData brut dans les résultats (trop lourd)
    // On renvoie uniquement les métadonnées + une version tronquée pour l'aperçu
    const flaggedSafe = flagged.map(item => ({
      source: item.source,
      deleteId: item.deleteId,
      field: item.field,
      index: item.index,
      album: item.album,
      uploaderNumeroH: item.uploaderNumeroH,
      uploaderName: item.uploaderName,
      familyName: item.familyName,
      label: item.label,
      reason: item.reason,
      // Prévisualisation : inclure l'image pour affichage
      preview: item.imageData
    }));

    res.json({
      success: true,
      total,
      scanned: total,
      flaggedCount: flagged.length,
      flagged: flaggedSafe
    });

  } catch (error) {
    console.error('Erreur scan modération:', error);
    if (error.message?.includes('HF_TOKEN')) {
      return res.status(503).json({
        success: false,
        message: 'HF_TOKEN non configuré — ajoutez HF_TOKEN dans backend/config.env'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors du scan : ' + error.message
    });
  }
});

/**
 * DELETE /api/admin/moderation/delete
 * Supprime une image signalée selon sa source.
 * Body: { source, deleteId, field?, index?, album? }
 */
router.delete('/delete', async (req, res) => {
  try {
    const { source, deleteId, field, index, album } = req.body;

    if (!source || !deleteId) {
      return res.status(400).json({ success: false, message: 'Paramètres manquants (source, deleteId)' });
    }

    switch (source) {
      // Supprimer une entrée de la galerie partagée
      case 'family_gallery': {
        const item = await FamilyGallery.findByPk(deleteId);
        if (!item) return res.status(404).json({ success: false, message: 'Image introuvable' });
        await item.destroy();
        break;
      }

      // Supprimer une entrée des médias santé
      case 'problem_media': {
        const item = await FamilyProblemMedia.findByPk(deleteId);
        if (!item) return res.status(404).json({ success: false, message: 'Média introuvable' });
        await item.destroy();
        break;
      }

      // Supprimer un champ photo simple sur l'utilisateur (photo, familyPhoto, manPhoto, wifePhoto)
      case 'user_photo':
      case 'user_field': {
        const user = await User.findByNumeroH(deleteId);
        if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        if (!field) return res.status(400).json({ success: false, message: 'Champ (field) manquant' });
        await user.update({ [field]: null });
        break;
      }

      // Supprimer une photo dans le tableau childrenPhotos
      case 'user_children': {
        const user = await User.findByNumeroH(deleteId);
        if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        if (index === undefined) return res.status(400).json({ success: false, message: 'Index manquant' });

        let children = [];
        try { children = JSON.parse(user.childrenPhotos || '[]'); } catch (_) {}
        children.splice(index, 1);
        await user.update({ childrenPhotos: JSON.stringify(children) });
        break;
      }

      // Supprimer une photo dans les albums galerie privée
      case 'user_album': {
        const user = await User.findByNumeroH(deleteId);
        if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        if (!album || index === undefined) {
          return res.status(400).json({ success: false, message: 'Album et index requis' });
        }

        let albums = {};
        try { albums = JSON.parse(user.galleryAlbums || '{}'); } catch (_) {}
        if (Array.isArray(albums[album])) {
          albums[album].splice(index, 1);
        }
        await user.update({ galleryAlbums: JSON.stringify(albums) });
        break;
      }

      default:
        return res.status(400).json({ success: false, message: `Source inconnue: ${source}` });
    }

    res.json({ success: true, message: 'Image supprimée avec succès' });

  } catch (error) {
    console.error('Erreur suppression modération:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur: ' + error.message });
  }
});

export default router;