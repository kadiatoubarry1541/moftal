import { PAYS_LISTE } from '../utils/proximity';

interface CountryFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CountryFilter({ value, onChange }: CountryFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-amber-700 font-medium whitespace-nowrap">🌍 Pays :</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-amber-300 rounded-lg px-2 py-1 bg-white text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
      >
        <option value="">— Tous les pays —</option>
        {PAYS_LISTE.map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </div>
  );
}
