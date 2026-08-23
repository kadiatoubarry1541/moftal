import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdCarousel } from "../components/AdCarousel";

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  generation: string;
  ethnie: string;
  region: string;
  photo?: string;
  manPhoto?: string;
  familyPhoto?: string;
  photoPreview?: string;
  logo?: string;
  role?: string;
  isAdmin?: boolean;
  email?: string;
  pays?: string;
  nationalite?: string;
  prenomPere?: string;
  prenomMere?: string;
  numeroHPere?: string;
  numeroHMere?: string;
  genre?: string;
  dateNaissance?: string;
  age?: number;
  telephone?: string;
  tel1?: string;
  [key: string]: string | number | boolean | undefined;
}

export function UserDashboard() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const navigate = useNavigate();

  // Fonction pour charger les données utilisateur depuis localStorage
  const loadUserData = () => {
    const sessionData = JSON.parse(
      localStorage.getItem("session_user") || "{}",
    );
    const user = sessionData.userData || sessionData;
    if (!user.numeroH) {
      navigate("/login");
      return;
    }
    setUserData(user as UserData);
  };

  useEffect(() => {
    loadUserData();

    // Écouter les mises à jour de session (ex: après modification de profil/photo)
    const handleSessionUpdate = () => loadUserData();
    window.addEventListener("session-updated", handleSessionUpdate);
    return () => window.removeEventListener("session-updated", handleSessionUpdate);
  }, [navigate]);

  if (!userData) {
    return (
      <div className="user-dashboard bg-gray-50 dark:bg-gray-900 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // L'accueil ne contient que les boutons (dans le bandeau du haut, collant) —
  // l'annonce vit ici, dans le contenu principal, pour pouvoir s'étirer
  // jusqu'au pied de page au lieu de laisser un vide en dessous.
  return (
    <div className="user-dashboard bg-white dark:bg-gray-900 h-full flex flex-col">
      <AdCarousel fill />
    </div>
  );
}

export default UserDashboard;
