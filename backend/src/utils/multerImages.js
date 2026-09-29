// Toutes les routes d'envoi de fichiers (multer) acceptent désormais n'importe
// quelle image, quel que soit son format, et la convertissent si le navigateur
// ne sait pas l'afficher (HEIC, BMP, TIFF…). Chargé une fois au démarrage.
import fs from 'fs';
import multer from 'multer';
import { estImage, convertirImagesRequete, imageAffichable } from './images.js';

const proto = Object.getPrototypeOf(multer());

async function convertirSurDisque(req) {
  const fichiers = [req.file, ...(Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat())].filter(Boolean);
  for (const f of fichiers) {
    if (f.buffer || !f.path || !estImage(f)) continue;
    try {
      const avant = await fs.promises.readFile(f.path);
      const r = await imageAffichable(avant, f.mimetype);
      if (r.buffer === avant) continue;
      const chemin = f.path.replace(/\.[^./\\]*$/, '') + '.' + r.ext;
      await fs.promises.writeFile(chemin, r.buffer);
      if (chemin !== f.path) await fs.promises.unlink(f.path).catch(() => {});
      f.path = chemin; f.filename = chemin.split(/[\\/]/).pop(); f.mimetype = r.mime; f.size = r.buffer.length;
    } catch { /* on garde le fichier d'origine */ }
  }
}

for (const nom of ['single', 'array', 'fields', 'any']) {
  const original = proto[nom];
  proto[nom] = function (...args) {
    if (!this.__imagesToutFormat) {
      const filtre = this.fileFilter;
      this.fileFilter = (req, file, cb) => (estImage(file) ? cb(null, true) : filtre(req, file, cb));
      this.__imagesToutFormat = true;
    }
    const mw = original.apply(this, args);
    return (req, res, next) => mw(req, res, (err) => {
      if (err) return next(err);
      convertirImagesRequete(req).then(() => convertirSurDisque(req)).then(() => next(), () => next());
    });
  };
}
