import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Appointment from '../models/Appointment.js';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import { positionDe, coordonneesValides } from '../utils/positionPro.js';

/**
 * Itinéraire jusqu'au lieu d'un rendez-vous accepté (guidage pas à pas).
 *
 * Calcul fait par OSRM (logiciel libre, carte OpenStreetMap) :
 *  - sur notre serveur Oracle : variables OSRM_URL_PIED et OSRM_URL_VOITURE
 *    (ex. http://osrm-pied:5000 et http://osrm-voiture:5000) ;
 *  - en attendant : le serveur public gratuit de FOSSGIS (usage raisonnable).
 *
 * Le point exact du pro ne quitte jamais le serveur autrement que pour le client
 * dont le rendez-vous est accepté (règle 5 du projet).
 */
const router = express.Router();
router.use(authenticate);

const OSRM = {
  pied: process.env.OSRM_URL_PIED || 'https://routing.openstreetmap.de/routed-foot',
  voiture: process.env.OSRM_URL_VOITURE || 'https://routing.openstreetmap.de/routed-car',
};

const DIRECTIONS = {
  left: 'à gauche', right: 'à droite', 'slight left': 'légèrement à gauche', 'slight right': 'légèrement à droite',
  'sharp left': 'franchement à gauche', 'sharp right': 'franchement à droite', straight: 'tout droit', uturn: 'demi-tour',
};
const ORDINAUX = ['1re', '2e', '3e', '4e', '5e', '6e'];

/** Consigne en français à partir d'une étape OSRM. */
export function consigne(etape) {
  const m = etape.maneuver || {};
  const dir = DIRECTIONS[m.modifier] || '';
  const rue = etape.name ? ` sur ${etape.name}` : '';
  switch (m.type) {
    case 'depart': return `Partez${rue}`;
    case 'arrive': return 'Vous êtes arrivé(e) à destination';
    case 'roundabout':
    case 'rotary': {
      const sortie = m.exit ? `${ORDINAUX[m.exit - 1] || `${m.exit}e`} sortie` : 'la sortie';
      return `Au rond-point, prenez la ${sortie}${rue}`;
    }
    case 'exit roundabout':
    case 'exit rotary': return `Sortez du rond-point${rue}`;
    case 'continue':
    case 'new name': return m.modifier && m.modifier !== 'straight' ? `Continuez ${dir}${rue}` : `Continuez tout droit${rue}`;
    case 'merge': return `Rejoignez la route ${dir}${rue}`.replace('  ', ' ');
    case 'fork': return `À la bifurcation, gardez ${dir || 'la direction'}${rue}`;
    case 'end of road': return `Au bout de la route, tournez ${dir}${rue}`;
    default:
      if (m.modifier === 'uturn') return `Faites demi-tour${rue}`;
      if (m.modifier === 'straight') return `Continuez tout droit${rue}`;
      return `Tournez ${dir || 'dans la direction indiquée'}${rue}`;
  }
}

/** Réponse OSRM → itinéraire Moftal (tracé, distance, durée, étapes en français). */
export function versItineraire(osrm) {
  const route = osrm?.routes?.[0];
  if (!route) return null;
  const etapes = (route.legs?.[0]?.steps || []).map((e) => ({
    consigne: consigne(e),
    distance: Math.round(e.distance || 0),
    position: { longitude: e.maneuver?.location?.[0], latitude: e.maneuver?.location?.[1] },
    type: e.maneuver?.type || '',
    direction: e.maneuver?.modifier || '',
  }));
  return {
    distance: Math.round(route.distance || 0),
    duree: Math.round(route.duration || 0),
    trace: route.geometry?.coordinates || [],
    etapes,
  };
}

// GET /api/itineraire/rendez-vous/:id?lat=..&lng=..&mode=pied|voiture
router.get('/rendez-vous/:id', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const mode = req.query.mode === 'voiture' ? 'voiture' : 'pied';
    if (!coordonneesValides(lat, lng)) return res.status(400).json({ success: false, message: 'Votre position est introuvable. Autorisez la localisation et réessayez.' });

    const rdv = await Appointment.findByPk(req.params.id);
    if (!rdv || rdv.patientNumeroH !== req.userId) return res.status(404).json({ success: false, message: 'Rendez-vous introuvable.' });
    if (rdv.status !== 'accepted') return res.status(403).json({ success: false, message: 'Le guidage s\'ouvre quand le rendez-vous est accepté.' });
    const pro = await ProfessionalAccount.findByPk(rdv.professionalAccountId);
    const arrivee = positionDe(pro);
    if (!arrivee) return res.status(404).json({ success: false, message: 'Ce professionnel n\'a pas encore indiqué la position de son établissement.' });

    const url = `${OSRM[mode]}/route/v1/${mode === 'voiture' ? 'driving' : 'foot'}/`
      + `${Number(lng)},${Number(lat)};${arrivee.longitude},${arrivee.latitude}`
      + '?overview=full&geometries=geojson&steps=true';
    let reponse;
    try {
      reponse = await fetch(url, { headers: { 'User-Agent': 'Moftal/1.0 (guidage rendez-vous)' }, signal: AbortSignal.timeout(12000) });
    } catch {
      return res.status(503).json({ success: false, message: 'Le calcul du chemin est indisponible pour le moment. Suivez le point vert sur la carte et le repère.' });
    }
    const donnees = await reponse.json().catch(() => null);
    const itineraire = donnees?.code === 'Ok' ? versItineraire(donnees) : null;
    if (!itineraire) {
      return res.status(502).json({ success: false, message: 'Aucun chemin trouvé sur la carte jusqu\'à ce lieu. Suivez le point vert et le repère.' });
    }
    res.json({ success: true, mode, itineraire, arrivee });
  } catch (error) {
    console.error('Erreur itinéraire:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
