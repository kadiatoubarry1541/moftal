const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

// Helper function to get auth token (session_user.token ou clé token séparée)
const getAuthToken = (): string | null => {
  const sessionData = localStorage.getItem('session_user');
  if (sessionData) {
    try {
      const parsed = JSON.parse(sessionData);
      const token = parsed.token ?? parsed.userData?.token ?? null;
      if (token) return token;
    } catch {
      // ignore
    }
  }
  return localStorage.getItem('token');
};

// Vérifier si le token est un fallback (non-JWT) généré hors-ligne
const isFallbackToken = (token: string): boolean => {
  return token.startsWith('fallback_');
};

// Récupérer le numéroH de la session
const getSessionNumeroH = (): string | null => {
  const sessionData = localStorage.getItem('session_user');
  if (sessionData) {
    try {
      const parsed = JSON.parse(sessionData);
      return parsed.numeroH || parsed.userData?.numeroH || null;
    } catch {
      return null;
    }
  }
  return null;
};

// Helper function for authenticated requests
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Non authentifié - veuillez vous reconnecter');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Si le token est un fallback (connexion hors-ligne), utiliser le header x-admin-numero-h
  // au lieu du Bearer token, car le backend ne peut pas vérifier un faux JWT
  if (isFallbackToken(token)) {
    const numeroH = getSessionNumeroH();
    if (numeroH) {
      headers['x-admin-numero-h'] = numeroH;
    } else {
      throw new Error('Session invalide - veuillez vous reconnecter');
    }
  } else {
    headers['Authorization'] = `Bearer ${token}`;
    // Ajouter aussi le header admin comme fallback en cas de token expiré
    const numeroH = getSessionNumeroH();
    if (numeroH) {
      headers['x-admin-numero-h'] = numeroH;
    }
  }

  try {
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
      throw new Error(error.message || `Erreur ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    // Erreur réseau : le backend n'est pas joignable
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      let port = '5002';
      try {
        port = new URL(API_URL.startsWith('http') ? API_URL : `http://${API_URL}`).port || port;
      } catch {
        // garder 5002 par défaut
      }
      throw new Error(
        `Impossible de contacter le serveur backend. Vérifiez que le serveur est démarré (port ${port}). ` +
        `Depuis la racine du projet : double-cliquez sur LANCER_BACKEND.bat ou exécutez "cd backend && npm start".`
      );
    }
    throw error;
  }
};

// Get all users with optional filters
export const getAllUsers = async (filters?: {
  search?: string;
  role?: string;
  type?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}) => {
  const params = new URLSearchParams();
  
  if (filters?.search) params.append('search', filters.search);
  if (filters?.role) params.append('role', filters.role);
  if (filters?.type) params.append('type', filters.type);
  if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.offset) params.append('offset', String(filters.offset));
  
  const queryString = params.toString();
  const url = `/api/admin/users${queryString ? `?${queryString}` : ''}`;
  
  return authenticatedFetch(url);
};

// Get a specific user by NumeroH
export const getUserByNumeroH = async (numeroH: string) => {
  return authenticatedFetch(`/api/admin/users/${encodeURIComponent(numeroH)}`);
};

// Update a user
export const updateUser = async (numeroH: string, updates: any) => {
  return authenticatedFetch(`/api/admin/users/${encodeURIComponent(numeroH)}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

// Toggle user active status
export const toggleUserStatus = async (numeroH: string) => {
  return authenticatedFetch(`/api/admin/users/${encodeURIComponent(numeroH)}/toggle-status`, {
    method: 'PATCH',
  });
};

// Change user role
export const changeUserRole = async (numeroH: string, role: 'user' | 'admin' | 'super-admin') => {
  return authenticatedFetch(`/api/admin/users/${encodeURIComponent(numeroH)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
};

// Delete a user
export const deleteUser = async (numeroH: string) => {
  return authenticatedFetch(`/api/admin/users/${encodeURIComponent(numeroH)}`, {
    method: 'DELETE',
  });
};

// Get platform statistics
export const getStats = async () => {
  return authenticatedFetch('/api/admin/stats');
};

// Get all families
export const getAllFamilies = async () => {
  return authenticatedFetch('/api/admin/families');
};

// Search users
export const searchUsers = async (filters: {
  q?: string;
  type?: string;
  role?: string;
  generation?: string;
  pays?: string;
  ethnie?: string;
}) => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  
  const queryString = params.toString();
  const url = `/api/admin/search${queryString ? `?${queryString}` : ''}`;
  
  return authenticatedFetch(url);
};

// ——— Admins de secteurs (santé, éducation, échanges) ———

export interface SectorInfo {
  sector: string;
  pagePath: string;
  pageName: string;
}

/** Secteurs que l'utilisateur gère (admin de page). */
export const getMySectors = async (): Promise<{ success: boolean; sectors: SectorInfo[] }> => {
  return authenticatedFetch('/api/page-admins/my-sectors');
};

/** Liste des admins de page (nécessite admin). */
export const getPageAdmins = async (): Promise<{ success: boolean; pageAdmins: any[] }> => {
  return authenticatedFetch('/api/page-admins');
};

/** Assigner un admin à une page (super-admin pour secteurs santé/éducation/échanges). */
export const addPageAdmin = async (body: {
  pagePath: string;
  pageName: string;
  adminNumeroH: string;
}) => {
  return authenticatedFetch('/api/page-admins', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

/** Retirer un admin de page. */
export const removePageAdmin = async (id: number) => {
  return authenticatedFetch(`/api/page-admins/${id}`, { method: 'DELETE' });
};

































