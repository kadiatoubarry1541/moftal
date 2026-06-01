// Configuration de l'application
// Si VITE_API_URL est défini, on l'utilise directement (dev local avec port non-standard).
// Sinon en dev, on utilise le proxy Vite (/api).
export const config = {
  API_BASE_URL: import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') + '/api'
    : (import.meta.env.DEV ? '/api' : '/api'),
  APP_NAME: "VivasAr",
  APP_VERSION: "1.0.0",
  FRONTEND_URL: "http://localhost:5173",

  // Endpoints principaux
  ENDPOINTS: {
    AUTH: {
      REGISTER: "/auth/register",
      LOGIN: "/auth/login",
      LOGOUT: "/auth/logout",
      PROFILE: "/auth/profile",
    },
    ADMIN: {
      USERS: "/admin/users",
      BADGES: "/admin/badges",
      LOGOS: "/admin/logos",
      STATS: "/admin/stats",
    },
    ACTIVITIES: {
      GROUPS: "/activities/groups",
      CREATE_GROUP: "/activities/create-group",
      JOIN_GROUP: "/activities/join-group",
      POSTS: "/activities/posts",
    },
    RESIDENCES: {
      GROUPS: "/residences/groups",
      JOIN: "/residences/groups/:id/join",
      POSTS: "/residences/groups/:id/posts",
    },
    EDUCATION: {
      FORMATIONS: "/education/formations",
      PROFESSORS: "/education/professors",
      COURSES: "/education/courses",
      REGISTRATIONS: "/education/my-registrations",
    },
    REGIONS: {
      GROUPS: "/regions/groups",
      CREATE_GROUP: "/regions/create-group",
      JOIN_GROUP: "/regions/join-group",
      POSTS: "/regions/posts",
    },
    ORGANIZATIONS: {
      GROUPS: "/organizations/groups",
      CREATE_GROUP: "/organizations/create-group",
      JOIN_GROUP: "/organizations/join-group",
      POSTS: "/organizations/posts",
    },
    FAITH: {
      POSTS: "/faith/posts",
      COMMUNITIES: "/faith/communities",
      BOOKS: "/faith/books",
      CREATE_POST: "/faith/create-post",
    },
    FRIENDS: {
      LIST: "/friends/list",
      REQUESTS: "/friends/requests",
      SEND_REQUEST: "/friends/send-request",
      RESPOND_REQUEST: "/friends/respond-request",
    },
  },
};

// Fonction utilitaire pour construire les URLs
export const buildApiUrl = (
  endpoint: string,
  params?: Record<string, string>,
) => {
  let url = `${config.API_BASE_URL}${endpoint}`;

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
  }

  return url;
};

// Fonction pour les appels API
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = buildApiUrl(endpoint);

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
};
