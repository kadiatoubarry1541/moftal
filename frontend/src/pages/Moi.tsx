import { Outlet, useNavigate } from "react-router-dom";

export function Moi() {
  const navigate = useNavigate();

  return (
    <div className="moi-layout min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-4">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate("/famille")}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-colors"
          >
            <span aria-hidden>←</span>
            <span>Famille</span>
          </button>
        </div>

        <div className="moi-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
