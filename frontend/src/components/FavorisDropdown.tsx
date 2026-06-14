import { useEffect, useRef, useState, type ReactNode } from "react";

interface FavorisDropdownProps {
  headerLabel: string;
  ariaLabel?: string;
  title?: string;
  widthClassName?: string;
  children: (close: () => void) => ReactNode;
}

/** Bouton "Favoris ▾" + menu déroulant — style commun à toute l'application. */
export function FavorisDropdown({ headerLabel, ariaLabel, title, widthClassName, children }: FavorisDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="min-h-[36px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors whitespace-nowrap"
        aria-label={ariaLabel}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>Favoris</span>
        <span className="text-[10px] opacity-70">▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute right-0 top-11 ${widthClassName || "w-52"} bg-white dark:bg-gray-800 rounded-xl shadow-2xl ring-1 ring-gray-200 dark:ring-gray-700 z-50 overflow-hidden py-1`}
          style={{ maxWidth: "none" }}
        >
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
            {headerLabel}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {children(() => setOpen(false))}
          </div>
        </div>
      )}
    </div>
  );
}

interface FavorisDropdownItemProps {
  icon: ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** Affiche une case à cocher (sélection multiple) au lieu d'une simple coche. */
  multi?: boolean;
}

export function FavorisDropdownItem({ icon, label, selected, onClick, disabled, multi }: FavorisDropdownItemProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
        selected
          ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold"
          : disabled
          ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
          : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
      }`}
    >
      <span className="flex-shrink-0 flex items-center justify-center w-4 h-4">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {multi ? (
        <span
          className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[10px] leading-none ${
            selected
              ? "bg-amber-500 border-amber-500 text-white"
              : "border-gray-300 dark:border-gray-600"
          }`}
        >
          {selected && "✓"}
        </span>
      ) : (
        selected && <span className="text-amber-600 dark:text-amber-400">✓</span>
      )}
    </button>
  );
}
