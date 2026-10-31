// Messages publiés dans les groupes (régions, quartiers, activités, organisations)
// et personnes autorisées à y publier.

export interface MessageGroupe {
  id: string;
  numeroH: string;
  author?: string;
  authorName: string;
  content: string;
  /** « text », « image », « video », « audio », « pdf »… */
  messageType: string;
  /** « information », « outil »… */
  category?: string;
  mediaUrl?: string | null;
  createdAt: string;
}

export interface PermissionPublication {
  id: string;
  numeroH: string;
  userName?: string | null;
}
