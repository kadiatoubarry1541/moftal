import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface Props {
  scope: string;
  location: string;
  locationName: string;
  /** Nom du type d'enfant affiché, ex: "quartiers", "sous-préfectures" */
  childLabel: string;
  canManage?: boolean;
}

interface ChildItem {
  id: string;
  name: string;
}

export interface ListeEnfantsHandle {
  open: () => void;
}

const ListeEnfants = forwardRef<ListeEnfantsHandle, Props>(function ListeEnfants(
  { scope, location, locationName, childLabel, canManage = false },
  ref
) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<ChildItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [nouveauNom, setNouveauNom] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const token = () => localStorage.getItem('token');

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `${API_BASE}/api/location-children?scope=${encodeURIComponent(scope)}&location=${encodeURIComponent(location)}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      const d = await r.json();
      if (d.success) setChildren(d.children || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [scope, location]);

  useImperativeHandle(ref, () => ({
    open: () => { setOpen(true); charger(); }
  }), [charger]);

  async function ajouter() {
    if (!nouveauNom.trim()) return;
    setEnvoiEnCours(true);
    try {
      const r = await fetch(`${API_BASE}/api/location-children`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, location, name: nouveauNom.trim() })
      });
      const d = await r.json();
      if (d.success) { setNouveauNom(''); charger(); }
      else alert(d.message || 'Erreur.');
    } catch {
      alert('Impossible de contacter le serveur.');
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function retirer(id: string) {
    if (!confirm('Retirer ce nom de la liste ?')) return;
    try {
      const r = await fetch(`${API_BASE}/api/location-children/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      });
      const d = await r.json();
      if (d.success) charger();
      else alert(d.message || 'Erreur.');
    } catch {
      alert('Impossible de contacter le serveur.');
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
      <div
        className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h2 className="font-black text-base">👥 {locationName} — {childLabel}</h2>
          <button onClick={() => setOpen(false)} className="text-gray-400 text-xl leading-none">✕</button>
        </div>

        <div className="p-4 space-y-3">
          {canManage && (
            <div className="flex gap-2">
              <input
                value={nouveauNom}
                onChange={e => setNouveauNom(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') ajouter(); }}
                placeholder={`Nom d'un(e) ${childLabel.replace(/s$/, '')}`}
                className="flex-1 min-w-0 border rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={ajouter}
                disabled={envoiEnCours || !nouveauNom.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex-shrink-0"
              >
                +
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center text-sm text-gray-400 py-6">Chargement...</div>
          ) : children.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">Aucun{childLabel.endsWith('s') ? '' : 'e'} {childLabel} pour l'instant</p>
          ) : (
            <div className="space-y-2">
              {children.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg p-3">
                  <span className="text-sm font-semibold text-gray-800">{c.name}</span>
                  {canManage && (
                    <button onClick={() => retirer(c.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold flex-shrink-0">
                      Retirer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ListeEnfants;
