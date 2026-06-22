import React from "react";

interface EarthIconProps {
  className?: string;
  size?: number;
}

export function EarthIcon({ className = "", size = 24 }: EarthIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Globe terrestre bleu - style simple et professionnel */}
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="url(#earthGradient)"
        stroke="#2563eb"
        strokeWidth="1.5"
      />
      {/* Continents stylisés en vert */}
      <path
        d="M8 9C8 9 9 8 10 8C11 8 12 9 12 10C12 11 11 12 10 12C9 12 8 11 8 10C8 9.5 8 9 8 9Z"
        fill="#1a8f1a"
        opacity="0.9"
      />
      <path
        d="M14 11C14 11 15 10 16 10C17 10 18 11 18 12C18 13 17 14 16 14C15 14 14 13 14 12C14 11.5 14 11 14 11Z"
        fill="#1a8f1a"
        opacity="0.9"
      />
      <path
        d="M6 14C6 14 7 13 8 13C9 13 10 14 10 15C10 16 9 17 8 17C7 17 6 16 6 15C6 14.5 6 14 6 14Z"
        fill="#1a8f1a"
        opacity="0.9"
      />
      <path
        d="M16 15C16 15 17 14 18 14C19 14 20 15 20 16C20 17 19 18 18 18C17 18 16 17 16 16C16 15.5 16 15 16 15Z"
        fill="#1a8f1a"
        opacity="0.9"
      />
      {/* Lignes de latitude/longitude en bleu clair */}
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="5"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="0.5"
        opacity="0.4"
      />
      <line
        x1="2"
        y1="12"
        x2="22"
        y2="12"
        stroke="#3b82f6"
        strokeWidth="0.5"
        opacity="0.4"
      />
      <line
        x1="12"
        y1="2"
        x2="12"
        y2="22"
        stroke="#3b82f6"
        strokeWidth="0.5"
        opacity="0.4"
      />
      {/* Définitions des gradients */}
      <defs>
        <linearGradient id="earthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

