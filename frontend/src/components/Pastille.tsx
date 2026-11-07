import { texteCompteur } from "../utils/compteur";

/** Pastille rouge d'un nombre (rien si 0) : jusqu'à 10, puis « 10+ ». */
export default function Pastille({ n, className = "" }: { n: number; className?: string }) {
  if (!n || n <= 0) return null;
  return (
    <span
      aria-label={`${texteCompteur(n)} nouveau(x)`}
      className={`min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-[18px] text-center shadow ring-2 ring-white ${className}`}
    >
      {texteCompteur(n)}
    </span>
  );
}
