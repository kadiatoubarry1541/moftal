/**
 * Admins de secteurs : santé, éducation, échanges, sécurité, journalisme.
 * Un admin de secteur (page admin pour /sante, /education, /echange, /securite, /journalisme)
 * peut uniquement valider ou refuser les inscriptions professionnelles de son secteur.
 * Seul le super-admin peut créer ou retirer des admins de secteur.
 */

export const SECTOR_PAGE_PATHS = {
  sante: '/sante',
  education: '/education',
  echange: '/echange',
  // Sous-secteurs spécifiques pour la page Échanges
  echange_primaire: '/echange/primaire',
  echange_secondaire: '/echange/secondaire',
  echange_tertiaire: '/echange/tertiaire',
  // Sous-secteur tertiaire dédié aux démarcheurs de maisons
  echange_tertiaire_demarcheurs: '/echange/tertiaire/demarcheurs',
  securite: '/securite',
  journalisme: '/journalisme',
  science: '/science',
  solidarite: '/solidarite'
};

export const SECTOR_NAMES = {
  sante: 'Santé',
  education: 'Éducation',
  echange: 'Échanges',
  echange_primaire: 'Échanges - Primaire',
  echange_secondaire: 'Échanges - Secondaire',
  echange_tertiaire: 'Échanges - Tertiaire',
  echange_tertiaire_demarcheurs: 'Échanges - Tertiaire (Démarcheurs)',
  securite: 'Sécurité',
  journalisme: 'Journalisme',
  science: 'Science',
  solidarite: 'Solidarité'
};

/** Types de comptes pro qui appartiennent à chaque secteur (pour filtre et permission). */
export const SECTOR_PRO_TYPES = {
  sante: ['clinic'],
  education: ['school'],
  // Secteur Échanges : plusieurs profils pro
  // - vendor    : vendeurs / détaillants
  // - supplier  : fournisseurs / grossistes
  // - producer  : entreprises de production
  // - broker    : démarcheurs (ex. location de maisons)
  echange: ['vendor', 'supplier', 'producer', 'broker'],
  // Les trois niveaux d'échanges partagent ces mêmes types pro,
  // mais chaque niveau peut avoir ses propres admins de page.
  echange_primaire: ['vendor', 'supplier', 'producer'],
  echange_secondaire: ['vendor', 'supplier', 'producer'],
  echange_tertiaire: ['vendor', 'supplier', 'producer'],
  // Sous-secteur tertiaire pour les démarcheurs de maisons uniquement
  echange_tertiaire_demarcheurs: ['broker'],
  securite: ['security_agency'],
  journalisme: ['journalist'],
  science: ['scientist'],
  solidarite: ['ngo']
};

/**
 * Retourne le secteur (clé) pour un type de compte professionnel, ou null.
 * @param {string} professionalType - type du ProfessionalAccount
 * @param {string|null} subSector - 'primaire' | 'secondaire' | 'tertiaire' | null
 * @returns {string|null}
 */
export function getSectorForProType(professionalType, subSector = null) {
  if (!professionalType) return null;
  const t = String(professionalType).toLowerCase();
  if (SECTOR_PRO_TYPES.sante.includes(t)) return 'sante';
  if (SECTOR_PRO_TYPES.education.includes(t)) return 'education';
  if (SECTOR_PRO_TYPES.securite.includes(t)) return 'securite';
  if (SECTOR_PRO_TYPES.journalisme.includes(t)) return 'journalisme';
  if (SECTOR_PRO_TYPES.science.includes(t)) return 'science';
  if (SECTOR_PRO_TYPES.solidarite.includes(t)) return 'solidarite';

  // Secteur Échanges : on utilise subSector pour trouver le bon admin
  if (SECTOR_PRO_TYPES.echange.includes(t)) {
    // broker va toujours en tertiaire
    if (t === 'broker') return 'echange_tertiaire_demarcheurs';
    // Pour vendor, supplier, producer : on suit le subSector déclaré à l'inscription
    if (subSector === 'primaire')   return 'echange_primaire';
    if (subSector === 'secondaire') return 'echange_secondaire';
    if (subSector === 'tertiaire')  return 'echange_tertiaire';
    // Fallback si pas de subSector : secteur général Échanges
    return 'echange';
  }
  return null;
}

/**
 * Vérifie si l'utilisateur est admin global (role admin ou super-admin).
 */
export function isGlobalAdmin(user) {
  if (!user) return false;
  // Comptes master administrateurs (NumeroH spéciaux) ou rôles admin
  if (user.numeroH === 'G7C7P7R7E7F7 7' || user.numeroH === 'G0C0P0R0E0F0 0') return true;
  return user.role === 'admin' || user.role === 'super-admin';
}

/**
 * Liste des secteurs que l'utilisateur gère (en tant que page admin).
 * @param {object} PageAdminModel - modèle PageAdmin (initialisé)
 * @param {string} numeroH - numeroH de l'utilisateur
 * @returns {Promise<string[]>} ex. ['sante', 'echange']
 */
export async function getManagedSectorsForUser(PageAdminModel, numeroH) {
  if (!PageAdminModel || !numeroH) return [];
  const pathKey = 'pagePath';
  const adminKey = 'adminNumeroH';
  const { Op } = await import('sequelize');
  const sectorPaths = Object.values(SECTOR_PAGE_PATHS);
  const rows = await PageAdminModel.findAll({
    where: {
      [adminKey]: numeroH,
      [pathKey]: sectorPaths.length === 1 ? sectorPaths[0] : { [Op.in]: sectorPaths },
      isActive: true
    },
    attributes: [pathKey]
  });
  const paths = (rows || []).map(r => (r.get ? r.get(pathKey) : r[pathKey])).filter(Boolean);
  const sectors = [];
  for (const [sector, path] of Object.entries(SECTOR_PAGE_PATHS)) {
    if (paths.includes(path)) sectors.push(sector);
  }
  return sectors;
}

/**
 * Vérifie si l'utilisateur peut approuver/rejeter un compte pro de ce type.
 * @param {object} PageAdminModel - modèle PageAdmin
 * @param {object} user - req.user
 * @param {string} professionalType - type du compte (clinic, school, supplier, etc.)
 */
export async function canUserApproveProfessional(PageAdminModel, user, professionalType, subSector = null) {
  if (!user) return false;
  if (isGlobalAdmin(user)) return true;
  const sector = getSectorForProType(professionalType, subSector);
  if (!sector) return false;
  const managed = await getManagedSectorsForUser(PageAdminModel, user.numeroH);
  return managed.includes(sector);
}

/**
 * Types professionnels visibles pour un ensemble de secteurs (pour filtre liste).
 * @param {string[]} sectors - ex. ['sante', 'education']
 * @returns {string[]} ex. ['clinic', 'school']
 */
export function getProTypesForSectors(sectors) {
  if (!Array.isArray(sectors) || sectors.length === 0) return [];
  const types = new Set();
  for (const s of sectors) {
    const t = SECTOR_PRO_TYPES[s];
    if (t) t.forEach(tt => types.add(tt));
  }
  return Array.from(types);
}
