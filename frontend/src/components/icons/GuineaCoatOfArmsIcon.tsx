import { useState } from "react";

interface GuineaCoatOfArmsIconProps {
  className?: string;
  size?: number;
}

export function GuineaCoatOfArmsIcon({ className = "", size = 64 }: GuineaCoatOfArmsIconProps) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <span className={`text-4xl ${className}`} style={{ width: size, height: Math.round(size * 1.3), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        🇬🇳
      </span>
    );
  }

  // SVG (5KB) au lieu du PNG (325KB) — gain de 320KB par chargement
  return (
    <img
      src="/armoiries-guinee.svg"
      alt="Armoiries de la Guinée"
      width={size}
      height={Math.round(size * 1.3)}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto' }}
      onError={() => setImageError(true)}
    />
  );
}
