import { useEffect, useState } from "react";

// Identité visuelle de l'espace professionnel ouvert (nom + logo du compte).
// Chaque page de gestion interne la publie (via InstallAppButton) pour que la
// barre du haut affiche le logo du professionnel, pas celui de Moftal.
export interface ProBrand { name?: string; logoUrl?: string; color?: string }

const EVENT = "moftal-pro-brand";
let current: ProBrand | null = null;

export function setProBrand(brand: ProBrand | null) {
  current = brand;
  window.dispatchEvent(new Event(EVENT));
}

export function useProBrand(): ProBrand | null {
  const [brand, setBrand] = useState<ProBrand | null>(current);
  useEffect(() => {
    const onChange = () => setBrand(current);
    window.addEventListener(EVENT, onChange);
    onChange();
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return brand;
}
