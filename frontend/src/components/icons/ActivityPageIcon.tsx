import React from "react";

interface ActivityPageIconProps {
  className?: string;
  size?: number;
}

/** Icône Réseau Professionnel : nœuds connectés entre eux (graphe de réseau) */
export function ActivityPageIcon({ className = "", size = 24 }: ActivityPageIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Lignes de connexion — dessinées en premier (derrière les nœuds) */}
      {/* Centre → Haut */}
      <line x1="12" y1="8.5" x2="12" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Centre → Bas gauche */}
      <line x1="9.8" y1="13.2" x2="5.8" y2="17.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Centre → Bas droit */}
      <line x1="14.2" y1="13.2" x2="18.2" y2="17.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Bas gauche → Bas droit */}
      <line x1="6" y1="19" x2="18" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Haut → Bas droit (connexion croisée = vrai réseau) */}
      <line x1="13.8" y1="4.2" x2="18.2" y2="17.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" />

      {/* Nœud central — hub (légèrement rempli pour le distinguer) */}
      <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.18" />

      {/* Nœuds périphériques */}
      <circle cx="12" cy="3"  r="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="4"  cy="19" r="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="20" cy="19" r="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
