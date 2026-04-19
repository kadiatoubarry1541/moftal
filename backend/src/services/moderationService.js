/**
 * Service de modération IA — détection de nudité / contenu explicite.
 * Utilise Hugging Face Inference API (gratuit, sans package natif).
 * Modèle : Falconsai/nsfw_image_detection (~93% de précision)
 * Compatible Cloudinary URLs, base64, et chemins fichiers locaux.
 *
 * Prérequis : variable d'environnement HF_TOKEN (token Hugging Face gratuit)
 * Créer un compte gratuit sur https://huggingface.co → Settings → Access Tokens
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HF_API_URL = 'https://api-inference.huggingface.co/models/Falconsai/nsfw_image_detection';

function getToken() {
  const token = process.env.HF_TOKEN;
  if (!token) {
    throw new Error('HF_TOKEN non configuré — ajoutez HF_TOKEN dans backend/config.env');
  }
  return token;
}

/**
 * Convertit des données image en Buffer binaire.
 * Accepte : URL Cloudinary, base64 data URL, chemin /uploads/...
 * @returns {{ buffer: Buffer|null, isVideo: boolean, error: string|null }}
 */
async function toBuffer(imageData) {
  if (!imageData || typeof imageData !== 'string') {
    return { buffer: null, isVideo: false, error: 'Pas de données image' };
  }

  // Vidéos → skip
  if (
    imageData.startsWith('data:video/') ||
    /\.(mp4|avi|mov|webm|mkv)(\?.*)?$/i.test(imageData)
  ) {
    return { buffer: null, isVideo: true, error: null };
  }

  try {
    if (imageData.startsWith('https://') || imageData.startsWith('http://')) {
      // URL Cloudinary ou externe : on télécharge les octets
      const res = await fetch(imageData);
      if (!res.ok) return { buffer: null, isVideo: false, error: `Impossible de télécharger l'image (${res.status})` };
      const arrayBuf = await res.arrayBuffer();
      return { buffer: Buffer.from(arrayBuf), isVideo: false, error: null };

    } else if (imageData.startsWith('data:image/')) {
      // Base64 data URL
      const base64 = imageData.split(',')[1];
      if (!base64) return { buffer: null, isVideo: false, error: 'Base64 invalide' };
      return { buffer: Buffer.from(base64, 'base64'), isVideo: false, error: null };

    } else if (imageData.startsWith('/uploads/') || imageData.startsWith('uploads/')) {
      // Fichier local
      const ext = path.extname(imageData).toLowerCase();
      if (['.mp4', '.avi', '.mov', '.webm'].includes(ext)) {
        return { buffer: null, isVideo: true, error: null };
      }
      const relative = imageData.startsWith('/') ? imageData.slice(1) : imageData;
      const filePath = path.join(__dirname, '../../', relative);
      if (!fs.existsSync(filePath)) {
        return { buffer: null, isVideo: false, error: 'Fichier introuvable' };
      }
      return { buffer: fs.readFileSync(filePath), isVideo: false, error: null };

    } else {
      return { buffer: null, isVideo: false, error: 'Format non supporté' };
    }
  } catch (err) {
    return { buffer: null, isVideo: false, error: err.message };
  }
}

/**
 * Analyse une image pour détecter la nudité / contenu inapproprié.
 * @param {string} imageData - URL Cloudinary, base64 data URL, ou chemin /uploads/...
 * @returns {{ isNSFW: boolean, reason: string }}
 */
export async function analyzeImage(imageData) {
  const { buffer, isVideo, error } = await toBuffer(imageData);

  if (isVideo) {
    return { isNSFW: false, reason: 'Vidéo — vérification manuelle recommandée' };
  }
  if (error || !buffer) {
    return { isNSFW: false, reason: error || 'Image non lisible' };
  }

  try {
    const token = getToken();

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream'
      },
      body: buffer
    });

    // Si le modèle est en cours de chargement côté HF, on attend et on réessaie
    if (response.status === 503) {
      await new Promise(r => setTimeout(r, 8000));
      const retry = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream'
        },
        body: buffer
      });
      if (!retry.ok) {
        return { isNSFW: false, reason: `Erreur API HuggingFace (${retry.status})` };
      }
      const data = await retry.json();
      return evaluateResults(data);
    }

    if (!response.ok) {
      const text = await response.text();
      return { isNSFW: false, reason: `Erreur API HuggingFace (${response.status}): ${text}` };
    }

    const data = await response.json();
    return evaluateResults(data);

  } catch (err) {
    if (err.message?.includes('HF_TOKEN')) throw err;
    console.error('[Modération] Erreur:', err.message);
    return { isNSFW: false, reason: `Erreur d'analyse : ${err.message}` };
  }
}

/**
 * Évalue les résultats du modèle Falconsai/nsfw_image_detection.
 * Retourne [{ label: "nsfw"|"normal", score: 0.xx }, ...]
 */
function evaluateResults(data) {
  if (!Array.isArray(data)) {
    return { isNSFW: false, reason: 'Réponse API inattendue' };
  }

  // Le modèle retourne deux labels : "nsfw" et "normal"
  const nsfw = data.find(d => d.label === 'nsfw');
  const score = nsfw?.score ?? 0;

  // Seuil : 60% de confiance (ajustable)
  if (score >= 0.60) {
    return {
      isNSFW: true,
      reason: `Contenu inapproprié détecté — confiance ${(score * 100).toFixed(0)}%`
    };
  }

  return { isNSFW: false, reason: 'Image conforme' };
}

/**
 * Analyse une liste d'images par petits lots.
 * @param {Array<{imageData: string, [key: string]: any}>} items
 * @param {number} batchSize
 * @returns {Promise<Array>}
 */
export async function analyzeImagesBatch(items, batchSize = 3) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const analysis = await analyzeImage(item.imageData);
        return { ...item, ...analysis };
      })
    );
    results.push(...batchResults);
  }

  return results;
}