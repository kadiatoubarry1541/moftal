import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { config } from "../config/api";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || (import.meta.env.VITE_API_URL || "");

export default function MonEspacePro() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    fetch(`${API}/api/professionals/my-accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const accounts: any[] = data.accounts || [];

        const activeAccounts = accounts.filter(
          (a) => a.status === "approved" && a.subscriptionStatus === "active"
        );

        if (activeAccounts.length === 1) {
          navigate(`/espace-pro/${activeAccounts[0].id}`, { replace: true });
          return;
        }

        if (activeAccounts.length > 1 || accounts.length > 0) {
          navigate("/mes-comptes-pro", { replace: true });
          return;
        }

        navigate("/inscription-pro", { replace: true });
      })
      .catch(() => {
        navigate("/mes-comptes-pro", { replace: true });
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Redirection vers votre espace professionnel...
        </p>
      </div>
    </div>
  );
}
