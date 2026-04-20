export interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  role?: string;
  isAdmin?: boolean;
  [key: string]: any;
}

/**
 * Vérifie si l'utilisateur est connecté et retourne ses données
 * @returns UserData si connecté, null sinon
 */
export function getSessionUser(): UserData | null {
  try {
    const session = localStorage.getItem("session_user");
    if (!session) {
      // Si pas de session, vérifier si un token existe (utilisateur peut être connecté)
      const token = localStorage.getItem("token");
      if (token) {
        console.warn("Token trouvé mais session manquante - l'utilisateur peut être connecté");
        // Ne pas retourner null immédiatement, essayer de récupérer les données
      }
      return null;
    }

    // Essayer de parser la session
    let parsed;
    try {
      parsed = JSON.parse(session);
    } catch (parseError) {
      console.error('Erreur lors du parsing de la session:', parseError);
      // Si le parsing échoue, vérifier si un token existe
      const token = localStorage.getItem("token");
      if (token) {
        console.warn("Session invalide mais token trouvé - l'utilisateur peut être connecté");
      }
      return null;
    }

    const user = parsed.userData || parsed;
    
    if (!user || !user.numeroH) {
      // Si pas de données utilisateur valides, vérifier si un token existe
      const token = localStorage.getItem("token");
      if (token) {
        console.warn("Session incomplète mais token trouvé - l'utilisateur peut être connecté");
      }
      return null;
    }
    
    return user as UserData;
  } catch (error) {
    console.error('Erreur lors de la lecture de la session:', error);
    // En cas d'erreur, vérifier si un token existe
    const token = localStorage.getItem("token");
    if (token) {
      console.warn("Erreur de session mais token trouvé - l'utilisateur peut être connecté");
    }
    return null;
  }
}

/**
 * Vérifie si l'utilisateur est un administrateur
 * @param user - Les données de l'utilisateur
 * @returns true si admin, false sinon
 */
export function isAdmin(user: UserData | null): boolean {
  if (!user) return false;
  
  const role = user.role?.toLowerCase() || '';
  return (
    role === 'admin' ||
    role === 'super-admin' ||
    role === 'administrator' ||
    user.isAdmin === true ||
    user.numeroH === 'G0C0P0R0E0F0 0' || // Comptes spéciaux admin
    user.numeroH === 'G7C7P7R7E7F7 7'
  );
}

/**
 * Vérifie si l'utilisateur est l'administrateur principal (seul à voir le badge couronne / droits roi)
 * @param user - Les données de l'utilisateur
 * @returns true si admin principal, false sinon
 */
export function isMasterAdmin(user: UserData | null): boolean {
  if (!user) return false;
  const role = user.role?.toLowerCase() || '';
  return (
    user.numeroH === 'G0C0P0R0E0F0 0' ||
    user.numeroH === 'G7C7P7R7E7F7 7' ||
    role === 'super-admin'
  );
}

/** Super Admin Principal (G7) : accès complet + peut accorder la visibilité */
export function isSuperAdmin7(user: UserData | null): boolean {
  if (!user) return false;
  return user.numeroH === 'G7C7P7R7E7F7 7';
}

/** Petit Admin (G0) : voit tout sauf 50% des comptes pro non accordés */
export function isSubAdmin0(user: UserData | null): boolean {
  if (!user) return false;
  return user.numeroH === 'G0C0P0R0E0F0 0';
}

/**
 * Vérifie si l'utilisateur est connecté
 * @returns true si connecté, false sinon
 */
export function isAuthenticated(): boolean {
  return getSessionUser() !== null;
}

/**
 * Vérifie si l'utilisateur est connecté et est admin
 * @returns true si connecté et admin, false sinon
 */
export function isAdminAuthenticated(): boolean {
  const user = getSessionUser();
  return user !== null && isAdmin(user);
}

/**
 * Construit l'URL complète de la photo de profil utilisateur.
 * Gère les cas : data URI, URL absolue HTTP, chemin relatif serveur, et absence de photo.
 * @param photo - Le champ photo de l'utilisateur (peut être undefined/null)
 * @returns L'URL complète ou null si pas de photo
 */
export function getPhotoUrl(photo?: string | null): string | null {
  if (!photo) return null;
  // Data URI (photo capturée localement)
  if (photo.startsWith("data:")) return photo;
  // Blob URL (preview locale)
  if (photo.startsWith("blob:")) return photo;
  // URL absolue (déjà complète)
  if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
  // Chemin relatif du serveur (ex: /uploads/photo-123.jpg)
  // En dev, le proxy Vite redirige /uploads vers le backend
  // En prod, le chemin relatif fonctionne directement
  if (photo.startsWith("/uploads/")) return photo;
  if (photo.startsWith("uploads/")) return "/" + photo;
  // Autre chemin relatif - construire l'URL complète
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '');
  return `${baseUrl}${photo.startsWith("/") ? photo : "/" + photo}`;
}

/**
 * RÈGLE : Le compteur du NumeroH (chiffre après l'espace) est confidentiel.
 * Il ne doit apparaître que sur la page Identité de l'utilisateur (sécurité).
 * Partout ailleurs (tableau de bord, profil, modale, etc.) on n'affiche que la partie avant l'espace.
 * Pour les autres utilisateurs, on n'affiche jamais le compteur.
 * @param showCompteur - true uniquement sur la page Identité (/identite), false partout ailleurs
 */
export function getNumeroHForDisplay(
  numeroH: string | null | undefined,
  isOwner: boolean,
  showCompteur: boolean = false
): string {
  if (!numeroH || typeof numeroH !== "string") return "";
  const trimmed = numeroH.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  const sansCompteur = parts[0] ?? trimmed;
  if (showCompteur && isOwner) return trimmed;
  return sansCompteur;
}

