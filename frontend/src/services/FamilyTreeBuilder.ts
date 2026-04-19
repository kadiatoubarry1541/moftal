/**
 * Service pour construire automatiquement l'arbre généalogique
 * en fonction des conditions remplies par les utilisateurs
 */

export interface FamilyMember {
  id: string;
  numeroH: string;
  prenom: string;
  nomFamille: string;
  genre: 'HOMME' | 'FEMME' | 'AUTRE';
  dateNaissance?: string;
  dateDeces?: string;
  photo?: string;
  relation: 'pere' | 'mere' | 'enfant' | 'conjoint' | 'frere' | 'soeur' | 'oncle' | 'tante' | 'cousin' | 'cousine' | 'grand-pere' | 'grand-mere';
  generation: string;
  isDeceased?: boolean;
  parentId?: string;
  children?: string[];
  isVisible?: boolean; // Si les conditions sont remplies
  missingConditions?: string[]; // Conditions manquantes pour afficher ce membre
}

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  genre?: string;
  dateNaissance?: string;
  generation?: string;
  prenomPere?: string;
  numeroHPere?: string;
  prenomMere?: string;
  numeroHMere?: string;
  perePhoto?: string;
  merePhoto?: string;
  photo?: string;
  [key: string]: any;
}

/**
 * Conditions pour afficher un membre dans l'arbre généalogique
 */
export const FAMILY_TREE_CONDITIONS = {
  // Pour afficher le PÈRE, il faut :
  PERE: {
    required: ['prenomPere', 'numeroHPere'],
    message: 'Prénom et NuméroH du père requis'
  },
  
  // Pour afficher la MÈRE, il faut :
  MERE: {
    required: ['prenomMere', 'numeroHMere'],
    message: 'Prénom et NuméroH de la mère requis'
  },
  
  // Pour afficher un CONJOINT, il faut :
  CONJOINT: {
    required: ['conjointPrenom', 'conjointNumeroH'],
    message: 'Informations du conjoint requises'
  },
  
  // Pour afficher des ENFANTS, il faut :
  ENFANTS: {
    required: ['enfants'],
    message: 'Ajouter au moins un enfant'
  },
  
  // Pour afficher des FRÈRES/SŒURS, il faut :
  SIBLINGS: {
    required: ['numeroHPere', 'numeroHMere'],
    message: 'NumérosH des parents requis pour trouver les frères/sœurs'
  },
  
  // Pour afficher les GRANDS-PARENTS, il faut :
  GRAND_PARENTS: {
    required: ['prenomPere', 'numeroHPere', 'prenomMere', 'numeroHMere'],
    message: 'Informations des parents requises pour afficher les grands-parents'
  }
};

/**
 * Vérifie si les conditions sont remplies pour afficher un membre
 */
export function checkConditions(
  memberType: keyof typeof FAMILY_TREE_CONDITIONS,
  userData: UserData
): { isValid: boolean; missingFields: string[] } {
  const condition = FAMILY_TREE_CONDITIONS[memberType];
  const missingFields: string[] = [];

  for (const field of condition.required) {
    if (!userData[field] || userData[field] === '') {
      missingFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Construit automatiquement l'arbre généalogique basé sur les données disponibles
 */
export function buildFamilyTree(userData: UserData): FamilyMember[] {
  const tree: FamilyMember[] = [];
  
  // 1. L'utilisateur lui-même (toujours visible)
  const userMember: FamilyMember = {
    id: `user-${userData.numeroH}`,
    numeroH: userData.numeroH,
    prenom: userData.prenom,
    nomFamille: userData.nomFamille,
    genre: (userData.genre?.toUpperCase() || 'AUTRE') as 'HOMME' | 'FEMME' | 'AUTRE',
    dateNaissance: userData.dateNaissance,
    photo: userData.photo,
    relation: 'enfant',
    generation: userData.generation || 'G1',
    isVisible: true,
    children: []
  };
  tree.push(userMember);

  // 2. PÈRE - Vérifie les conditions
  const pereCheck = checkConditions('PERE', userData);
  if (pereCheck.isValid) {
    const pereMember: FamilyMember = {
      id: `pere-${userData.numeroHPere}`,
      numeroH: userData.numeroHPere!,
      prenom: userData.prenomPere!,
      nomFamille: userData.nomFamille,
      genre: 'HOMME',
      photo: userData.perePhoto,
      relation: 'pere',
      generation: calculatePreviousGeneration(userData.generation || 'G1'),
      isVisible: true,
      children: [userMember.id]
    };
    tree.push(pereMember);
    userMember.parentId = pereMember.id;
  } else {
    // Affiche un placeholder si les conditions ne sont pas remplies
    const perePlaceholder: FamilyMember = {
      id: 'pere-placeholder',
      numeroH: 'N/A',
      prenom: 'Père',
      nomFamille: userData.nomFamille,
      genre: 'HOMME',
      relation: 'pere',
      generation: calculatePreviousGeneration(userData.generation || 'G1'),
      isVisible: false,
      missingConditions: pereCheck.missingFields,
      children: []
    };
    tree.push(perePlaceholder);
  }

  // 3. MÈRE - Vérifie les conditions
  const mereCheck = checkConditions('MERE', userData);
  if (mereCheck.isValid) {
    const mereMember: FamilyMember = {
      id: `mere-${userData.numeroHMere}`,
      numeroH: userData.numeroHMere!,
      prenom: userData.prenomMere!,
      nomFamille: userData.nomFamille,
      genre: 'FEMME',
      photo: userData.merePhoto,
      relation: 'mere',
      generation: calculatePreviousGeneration(userData.generation || 'G1'),
      isVisible: true,
      children: [userMember.id]
    };
    tree.push(mereMember);
  } else {
    const merePlaceholder: FamilyMember = {
      id: 'mere-placeholder',
      numeroH: 'N/A',
      prenom: 'Mère',
      nomFamille: userData.nomFamille,
      genre: 'FEMME',
      relation: 'mere',
      generation: calculatePreviousGeneration(userData.generation || 'G1'),
      isVisible: false,
      missingConditions: mereCheck.missingFields,
      children: []
    };
    tree.push(merePlaceholder);
  }

  // 4. GRANDS-PARENTS PATERNELS (si le père est défini)
  if (pereCheck.isValid) {
    // Grand-père paternel (placeholder si pas de données)
    const grandPerePaternel: FamilyMember = {
      id: 'grand-pere-paternel-placeholder',
      numeroH: 'N/A',
      prenom: 'Grand-père paternel',
      nomFamille: userData.nomFamille,
      genre: 'HOMME',
      relation: 'grand-pere',
      generation: calculatePreviousGeneration(calculatePreviousGeneration(userData.generation || 'G1')),
      isVisible: false,
      missingConditions: ['Information du grand-père paternel non disponible'],
      children: [tree.find(m => m.id === `pere-${userData.numeroHPere}`)?.id || '']
    };
    tree.push(grandPerePaternel);

    // Grand-mère paternelle
    const grandMerePaternelle: FamilyMember = {
      id: 'grand-mere-paternelle-placeholder',
      numeroH: 'N/A',
      prenom: 'Grand-mère paternelle',
      nomFamille: userData.nomFamille,
      genre: 'FEMME',
      relation: 'grand-mere',
      generation: calculatePreviousGeneration(calculatePreviousGeneration(userData.generation || 'G1')),
      isVisible: false,
      missingConditions: ['Information de la grand-mère paternelle non disponible'],
      children: [tree.find(m => m.id === `mere-${userData.numeroHPere}`)?.id || '']
    };
    tree.push(grandMerePaternelle);
  }

  // 5. GRANDS-PARENTS MATERNELS (si la mère est définie)
  if (mereCheck.isValid) {
    const grandPereMaternel: FamilyMember = {
      id: 'grand-pere-maternel-placeholder',
      numeroH: 'N/A',
      prenom: 'Grand-père maternel',
      nomFamille: userData.nomFamille,
      genre: 'HOMME',
      relation: 'grand-pere',
      generation: calculatePreviousGeneration(calculatePreviousGeneration(userData.generation || 'G1')),
      isVisible: false,
      missingConditions: ['Information du grand-père maternel non disponible'],
      children: [tree.find(m => m.id === `mere-${userData.numeroHMere}`)?.id || '']
    };
    tree.push(grandPereMaternel);

    const grandMereMaternelle: FamilyMember = {
      id: 'grand-mere-maternelle-placeholder',
      numeroH: 'N/A',
      prenom: 'Grand-mère maternelle',
      nomFamille: userData.nomFamille,
      genre: 'FEMME',
      relation: 'grand-mere',
      generation: calculatePreviousGeneration(calculatePreviousGeneration(userData.generation || 'G1')),
      isVisible: false,
      missingConditions: ['Information de la grand-mère maternelle non disponible'],
      children: [tree.find(m => m.id === `mere-${userData.numeroHMere}`)?.id || '']
    };
    tree.push(grandMereMaternelle);
  }

  // 6. CONJOINT (si défini dans userData)
  if (userData.conjointPrenom && userData.conjointNumeroH) {
    const conjointMember: FamilyMember = {
      id: `conjoint-${userData.conjointNumeroH}`,
      numeroH: userData.conjointNumeroH,
      prenom: userData.conjointPrenom,
      nomFamille: userData.conjointNomFamille || userData.nomFamille,
      genre: (userData.conjointGenre?.toUpperCase() || 'AUTRE') as 'HOMME' | 'FEMME' | 'AUTRE',
      relation: 'conjoint',
      generation: userData.generation || 'G1',
      isVisible: true,
      children: []
    };
    tree.push(conjointMember);
  }

  // 7. ENFANTS (si définis dans userData)
  if (userData.enfants && Array.isArray(userData.enfants) && userData.enfants.length > 0) {
    userData.enfants.forEach((enfant: any, index: number) => {
      const enfantMember: FamilyMember = {
        id: `enfant-${enfant.numeroH || index}`,
        numeroH: enfant.numeroH || `ENF${index}`,
        prenom: enfant.prenom || 'Enfant',
        nomFamille: enfant.nomFamille || userData.nomFamille,
        genre: (enfant.genre?.toUpperCase() || 'AUTRE') as 'HOMME' | 'FEMME' | 'AUTRE',
        dateNaissance: enfant.dateNaissance,
        relation: enfant.genre?.toUpperCase() === 'HOMME' ? 'frere' : 'soeur',
        generation: calculateNextGeneration(userData.generation || 'G1'),
        isVisible: true,
        parentId: userMember.id,
        children: []
      };
      tree.push(enfantMember);
      if (!userMember.children) userMember.children = [];
      userMember.children.push(enfantMember.id);
    });
  }

  // 8. DÉFUNTS enregistrés manuellement par cet utilisateur
  try {
    const key = `deceased_members_${userData.numeroH}`
    const deceasedList: any[] = JSON.parse(localStorage.getItem(key) || '[]')
    const relationMap: Record<string, FamilyMember['relation']> = {
      'pere': 'pere',
      'mere': 'mere',
      'fils': 'enfant',
      'fille': 'enfant',
      'grand-pere': 'grand-pere',
      'grand-mere': 'grand-mere',
      'arriere-grand-pere': 'grand-pere',
      'arriere-grand-mere': 'grand-mere',
      'frere': 'frere',
      'soeur': 'soeur',
      'oncle': 'oncle',
      'tante': 'tante',
      'cousin': 'cousin',
      'cousine': 'cousine',
      'autre': 'pere'
    }
    deceasedList.forEach((d: any, i: number) => {
      const rel = relationMap[d.relation] || 'pere'
      const genMap: Record<string, string> = {
        'pere': 'G0', 'mere': 'G0',
        'grand-pere': 'G-1', 'grand-mere': 'G-1',
        'enfant': 'G2',
        'frere': 'G1', 'soeur': 'G1',
        'oncle': 'G0', 'tante': 'G0',
        'cousin': 'G1', 'cousine': 'G1'
      }
      const deceasedMember: FamilyMember = {
        id: `deceased-${d.numeroHD || d.numeroH || i}`,
        numeroH: d.numeroHD || d.numeroH || `D${i}`,
        prenom: d.prenom || d.nom || 'Défunt',
        nomFamille: d.nomFamille || d.famille || userData.nomFamille,
        genre: d.genre?.toUpperCase() === 'FEMME' ? 'FEMME' : 'HOMME',
        dateNaissance: d.dateNaissance,
        dateDeces: d.dateDeces || (d.anneeDeces ? `${d.anneeDeces}-01-01` : undefined),
        relation: rel,
        generation: genMap[rel] || 'G0',
        isDeceased: true,
        isVisible: true
      }
      tree.push(deceasedMember)
    })
  } catch { /* ignore */ }

  return tree;
}

/**
 * Calcule la génération précédente
 */
function calculatePreviousGeneration(currentGen: string): string {
  const match = currentGen.match(/G(-?\d+)/);
  if (match) {
    const num = parseInt(match[1]);
    return `G${num - 1}`;
  }
  return 'G0';
}

/**
 * Calcule la génération suivante
 */
function calculateNextGeneration(currentGen: string): string {
  const match = currentGen.match(/G(-?\d+)/);
  if (match) {
    const num = parseInt(match[1]);
    return `G${num + 1}`;
  }
  return 'G2';
}

/**
 * Comptes pour "Le Cercle des Racines" (remplis à partir de l'arbre et du profil)
 */
export interface CercleDesRacinesCounts {
  nbFreresMere: number
  nbSoeursMere: number
  nbFreresPere: number
  nbSoeursPere: number
  nbTantesMaternelles: number
  nbTantesPaternelles: number
  nbOnclesMaternels: number
  nbOnclesPaternels: number
  nbCousins: number
  nbCousines: number
  nbFilles: number
  nbGarcons: number
}

/**
 * Calcule les effectifs du Cercle des Racines à partir de l'arbre familial et du profil.
 * - Filles / Garçons : déduits des enfants dans l'arbre (ou du profil si l'arbre n'a pas d'enfants).
 * - Frères, sœurs, tantes, oncles, cousins : issus du profil (userData) ; l'arbre pourra les fournir plus tard via l'API.
 */
export function getCercleDesRacinesCounts(
  userData: UserData,
  familyMembers: FamilyMember[]
): CercleDesRacinesCounts {
  const userId = `user-${userData.numeroH}`

  const children = familyMembers.filter(
    (m) => m.parentId === userId && (m.relation === 'frere' || m.relation === 'soeur')
  )
  const nbFillesFromTree = children.filter((m) => m.genre === 'FEMME').length
  const nbGarconsFromTree = children.filter((m) => m.genre === 'HOMME').length

  const nbFilles = nbFillesFromTree > 0 ? nbFillesFromTree : (userData.nbFilles ?? 0)
  const nbGarcons = nbGarconsFromTree > 0 ? nbGarconsFromTree : (userData.nbGarcons ?? 0)

  return {
    nbFreresMere: userData.nbFreresMere ?? 0,
    nbSoeursMere: userData.nbSoeursMere ?? 0,
    nbFreresPere: userData.nbFreresPere ?? 0,
    nbSoeursPere: userData.nbSoeursPere ?? 0,
    nbTantesMaternelles: userData.nbTantesMaternelles ?? 0,
    nbTantesPaternelles: userData.nbTantesPaternelles ?? 0,
    nbOnclesMaternels: userData.nbOnclesMaternels ?? 0,
    nbOnclesPaternels: userData.nbOnclesPaternels ?? 0,
    nbCousins: userData.nbCousins ?? 0,
    nbCousines: userData.nbCousines ?? 0,
    nbFilles,
    nbGarcons
  }
}

/**
 * Obtient les recommandations pour compléter l'arbre
 */
export function getTreeCompletionRecommendations(userData: UserData): string[] {
  const recommendations: string[] = [];

  const pereCheck = checkConditions('PERE', userData);
  if (!pereCheck.isValid) {
    recommendations.push(`Ajouter les informations du père : ${pereCheck.missingFields.join(', ')}`);
  }

  const mereCheck = checkConditions('MERE', userData);
  if (!mereCheck.isValid) {
    recommendations.push(`Ajouter les informations de la mère : ${mereCheck.missingFields.join(', ')}`);
  }

  if (!userData.conjointPrenom) {
    recommendations.push('Ajouter les informations de votre conjoint(e)');
  }

  if (!userData.enfants || !Array.isArray(userData.enfants) || userData.enfants.length === 0) {
    recommendations.push('Ajouter vos enfants pour compléter l\'arbre généalogique');
  }

  return recommendations;
}

