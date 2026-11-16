import { lazy, Suspense, useEffect, useState } from "react";

const CarteLibre = lazy(() => import("./CarteLibre"));
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5002";

interface CompteAVerifier {
  id: string;
  name: string;
  address?: string;
  city?: string;
  quartierGps?: string;
  latitude: number;
  longitude: number;
  repere?: string;
  photoFacade?: string;
  positionLe?: string;
}

/** Admin : positions d'établissements dont le quartier GPS ne correspond pas à l'adresse déclarée. */
export default function AdminPositionsAVerifier() {
  const [comptes, setComptes] = useState<CompteAVerifier[]>([]);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);
  const entetes = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  const charger = () =>
    fetch(`${API_BASE}/api/professionals/admin/positions-a-verifier`, { headers: entetes() })
      .then((r) => r.json())
      .then((d) => setComptes(d.success ? d.comptes || [] : []))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chargé une seule fois
  useEffect(() => { void charger(); }, []);

  const valider = async (id: string) => {
    setOccupe(id);
    try {
      const r = await fetch(`${API_BASE}/api/professionals/admin/${id}/position-verifiee`, { method: "PUT", headers: entetes() });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.message || "Erreur");
      setComptes((l) => l.filter((c) => c.id !== id));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setOccupe(null);
    }
  };

  if (!comptes.length) return null;
  return (
    <div className="bg-amber-50 rounded-2xl border border-amber-300 p-4">
      <div className="font-bold text-amber-900 mb-1">📍 Positions à vérifier ({comptes.length})</div>
      <p className="text-xs text-amber-800 mb-3">Le quartier trouvé par le GPS ne correspond pas à l'adresse déclarée par le pro.</p>
      <div className="space-y-3">
        {comptes.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-amber-200 p-3">
            <div className="font-semibold text-gray-900">{c.name}</div>
            <div className="text-xs text-gray-600 mt-0.5">
              Adresse déclarée : <strong>{[c.address, c.city].filter(Boolean).join(", ") || "—"}</strong> · Quartier GPS : <strong>{c.quartierGps || "—"}</strong>
            </div>
            {c.repere && <div className="text-xs text-gray-600 mt-0.5">Repère : {c.repere}</div>}
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => setOuvert(ouvert === c.id ? null : c.id)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-semibold">
                {ouvert === c.id ? "Fermer" : "Voir sur la carte"}
              </button>
              <button type="button" disabled={occupe === c.id} onClick={() => void valider(c.id)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60">
                ✓ Position correcte
              </button>
            </div>
            {ouvert === c.id && (
              <div className="mt-3 space-y-2">
                <Suspense fallback={<div className="h-[220px] rounded-xl bg-gray-100 animate-pulse" />}>
                  <CarteLibre points={[{ id: c.id, latitude: c.latitude, longitude: c.longitude }]} hauteur={220} />
                </Suspense>
                {c.photoFacade && <img src={c.photoFacade} alt="Façade" className="w-full max-h-48 object-cover rounded-lg" />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
