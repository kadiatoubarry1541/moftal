import { useState, forwardRef, useImperativeHandle } from 'react';
import { REGLES_LOCALITE, NUMERO_EMOJI } from '../utils/reglesLocalite';

interface Props {
  title: string;
}

export interface ReglesLocaliteHandle {
  open: () => void;
}

const ReglesLocalite = forwardRef<ReglesLocaliteHandle, Props>(function ReglesLocalite({ title }, ref) {
  const [open, setOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
  }), []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
      <div
        className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h2 className="font-black text-base">📜 {title}</h2>
          <button onClick={() => setOpen(false)} className="text-gray-400 text-xl leading-none">✕</button>
        </div>
        <div className="p-4">
          <ul className="space-y-2.5 text-sm text-gray-600">
            {REGLES_LOCALITE.map((regle, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex-shrink-0">{NUMERO_EMOJI[i] || `${i + 1}.`}</span>
                <span>{regle}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
});

export default ReglesLocalite;
