import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface PageAdminData {
  id: number;
  pagePath: string;
  pageName: string;
  adminNumeroH: string;
  admin: {
    numeroH: string;
    prenom: string;
    nomFamille: string;
    photo?: string;
  };
}

interface PageAdminBadgeProps {
  pagePath: string;
  currentUserNumeroH?: string;
}

export default function PageAdminBadge({ pagePath, currentUserNumeroH }: PageAdminBadgeProps) {
  const [pageAdmins, setPageAdmins] = useState<PageAdminData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPageAdmins();
  }, [pagePath]);

  const loadPageAdmins = async () => {
    try {
      // Nettoyer le pagePath pour l'API
      const cleanPath = pagePath.replace(/^\//, '');
      const response = await fetch(`${API_BASE}/api/page-admins/page/${cleanPath}`);
      
      if (response.ok) {
        const data = await response.json();
        setPageAdmins(data.pageAdmins || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des admins de page:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || pageAdmins.length === 0) return null;

  return (
    <div className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
      <div className="space-y-3">
        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          👑 Chef{pageAdmins.length > 1 ? 's' : ''} de page :
        </div>
        {pageAdmins.map((pageAdmin, index) => {
          const isCurrentUserAdmin = currentUserNumeroH === pageAdmin.adminNumeroH;
          const isFirstChef = index === 0;
          
          return (
            <div key={pageAdmin.id} className={`flex items-center justify-between ${index < pageAdmins.length - 1 ? 'border-b border-blue-200 dark:border-blue-700 pb-3' : ''}`}>
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-lg font-bold shadow-lg">
                  {pageAdmin.admin.photo ? (
                    <img
                      src={pageAdmin.admin.photo}
                      alt={pageAdmin.admin.prenom}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    pageAdmin.admin.prenom?.charAt(0) || "A"
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {pageAdmin.admin.prenom} {pageAdmin.admin.nomFamille}
                    </span>
                    {isFirstChef && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                        Chef principal
                      </span>
                    )}
                    {!isFirstChef && (
                      <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-semibold rounded-full">
                        2ème chef
                      </span>
                    )}
                    {isCurrentUserAdmin && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-semibold rounded-full">
                        Vous
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {index === 0 ? 'Chef principal' : 'Chef suppléant'} de "{pageAdmin.pageName}"
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

