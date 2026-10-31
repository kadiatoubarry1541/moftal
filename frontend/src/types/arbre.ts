// Personnes renvoyées par le serveur pour construire l'arbre généalogique
// (/api/parent-child, /api/couple, /api/sibling, /api/family-tree).

export type Genre = 'HOMME' | 'FEMME' | 'AUTRE'

/** Personne reliée par un lien confirmé (parent, enfant, frère, sœur, conjoint…) */
export interface PersonneLiee {
  numeroH: string
  prenom: string
  nomFamille: string
  genre: Genre
  dateNaissance?: string
  dateDeces?: string | null
  photo?: string
  /** Pour /my-parents : « pere » ou « mere » */
  parentType?: 'pere' | 'mere'
}

/** Défunt enregistré en base (/api/family-tree/tree → deceasedMembers) */
export interface DefuntServeur {
  numeroHD?: string
  numeroH?: string
  prenom?: string
  nom?: string
  nomFamille?: string
  famille?: string
  genre?: string
  dateNaissance?: string
  dateDeces?: string
  anneeDeces?: number | string
  relation?: string
  createdBy?: string
  numeroHPere?: string
  numeroHMere?: string
  photo?: string
  additionalInfo?: { relationAvecDeclarant?: string }
}

/** Enfant noté dans le profil de l'utilisateur */
export interface EnfantProfil {
  numeroH?: string
  prenom?: string
  nomFamille?: string
  genre?: string
  dateNaissance?: string
}

/** Arbre du conjoint (/api/family-tree/spouse-tree) : complet après un an d'union */
export interface ArbreConjoint {
  accessLevel: 'limited' | 'full'
  unionDays?: number
  daysUntilFullAccess?: number
  tree?: {
    familyCode?: string
    memberCount?: number
    members?: PersonneLiee[]
  }
}

/** Méta de l'arbre familial (/api/family-tree/tree → tree) */
export interface InfosArbre {
  /** UUID de l'arbre */
  id?: string
  familyCode?: string
  bloodNumber?: string
  codePaiementRequis?: boolean
  members?: PersonneLiee[]
  deceasedMembers?: DefuntServeur[]
}

/** Fiche complète d'un défunt (/api/family-tree/deceased/:numeroHD) */
export interface DefuntDetail extends DefuntServeur {
  causeDeces?: string
  lieuDeces?: string
  decet?: string
  ethnie?: string
  generation?: string
  pays?: string
  regionOrigine?: string
  religion?: string
}

/** Chefs du compte familial : deux gérants et un conseiller */
export interface ChefsArbre {
  estAdmin?: boolean
  gerant1?: string | null
  gerant1Nom?: string | null
  gerant1Photo?: string | null
  gerant2?: string | null
  gerant2Nom?: string | null
  gerant2Photo?: string | null
  conseiller?: string | null
  conseillerNom?: string | null
  conseillerPhoto?: string | null
}

/** Message d'un espace de la famille (Inspir, livres) : /api/organizations/posts */
export interface MessageOrganisation {
  id: string
  author: string
  authorName: string
  numeroH: string
  content: string
  /** « text », « image », « video », « audio », « pdf »… */
  messageType: string
  category?: string
  postCategory?: string
  mediaUrl?: string | null
  section?: string
  createdAt: string
}

/** Lien parent-enfant (/api/parent-child/my-parents) : le lien, avec la personne dedans */
export interface LienParent {
  id: string
  parentNumeroH: string
  childNumeroH: string
  parentType: 'pere' | 'mere'
  status: string
  parent: PersonneLiee | null
}
