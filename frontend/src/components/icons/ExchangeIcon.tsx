import React from "react";

interface ExchangeIconProps {
  className?: string;
  size?: number;
}

export function ExchangeIcon({ className = "", size = 24 }: ExchangeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Marché attractif avec produits de qualité visibles */}
      {/* Toit/auvent coloré et attrayant */}
      <path
        d="M4 8L12 3L20 8V10H4V8Z"
        fill="#f59e0b"
        stroke="#d97706"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Support central élégant */}
      <line x1="12" y1="3" x2="12" y2="18" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
      
      {/* Supports latéraux */}
      <line x1="6" y1="8" x2="6" y2="17" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="8" x2="18" y2="17" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Table/étal avec panier */}
      <rect
        x="5"
        y="10"
        width="14"
        height="3"
        rx="1"
        fill="#78716c"
        stroke="#57534e"
        strokeWidth="1"
      />
      
      {/* Panier rempli avec produits colorés et visibles */}
      <path
        d="M7 11L8 13L10 13L11 11"
        stroke="#d97706"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Produits frais et colorés bien visibles */}
      <circle cx="7.5" cy="11.5" r="1.8" fill="#22c55e" stroke="#1a8f1a" strokeWidth="0.5" />
      <circle cx="7.8" cy="12.2" r="1.3" fill="#1a8f1a" />
      
      {/* Produit orange au centre */}
      <circle cx="12" cy="11.5" r="1.8" fill="#f59e0b" stroke="#d97706" strokeWidth="0.5" />
      <circle cx="12.3" cy="12" r="1.2" fill="#fbbf24" />
      
      {/* Produit rouge vif */}
      <circle cx="16.5" cy="11.5" r="1.8" fill="#ef4444" stroke="#dc2626" strokeWidth="0.5" />
      <circle cx="16.8" cy="12.2" r="1.3" fill="#f87171" />
      
      {/* Étoiles pour montrer la qualité */}
      <path
        d="M9 9L9.5 9.8L10.5 10L10 10.7L10.2 11.8L9 11.2L7.8 11.8L8 10.7L7.5 10L8.5 9.8L9 9Z"
        fill="#fbbf24"
      />
      <path
        d="M15 9L15.3 9.5L15.9 9.6L15.5 10L15.6 10.6L15 10.3L14.4 10.6L14.5 10L14.1 9.6L14.7 9.5L15 9Z"
        fill="#fbbf24"
      />
      
      {/* Base solide */}
      <rect
        x="5.5"
        y="17"
        width="13"
        height="2"
        rx="1"
        fill="#57534e"
      />
    </svg>
  );
}
