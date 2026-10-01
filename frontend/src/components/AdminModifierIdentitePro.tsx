import { useRef, useState } from "react";
import { config } from "../config/api";
import LogoPicker from "./LogoPicker";
import LogoEtablissement from "./LogoEtablissement";
import { normaliserLogo } from "../utils/logoImage";

const API_BASE = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";

// Couleur du générateur de logos, selon le secteur (comme à l'inscription)
const LOGO_COLORS: Record<string, string> = {
  clinic: "#1a8f1a", health_worker: "#059669", school: "#1a8f1a", mosque: "#1a8f1a",
  madrasa: "#0891b2", commerce: "#d97706", security_agency: "#475569", journalist: "#dc2626",
  enterprise: "#4f46e5", restaurant: "#ea580c", vendor: "#0891b2", supplier: "#0e7490",
  producer: "#7c3aed", broker: "#b45309", scientist: "#4338ca", ngo: "#e11d48",
  transport: "#1d4ed8", beauty: "#db2777", artisan: "#d97706", mairie: "#1d4ed8", reseau: "#2563eb",
};

interface ProIdentite { id: string; type: string; name: string; photo?: string | null }

// L'admin modifie à distance le nom et le logo d'un compte professionnel.
// Enregistré en base : le changement suit partout (gestion, site vitrine, listes, app).
export default function AdminModifierIdentitePro({ pro, onClose, onSaved }: {
  pro: ProIdentite;
  onClose: () => void;
  onSaved: (pro: { id: string; name: string; photo: string | null }) => void;
}) {
  const [name, setName] = useState(pro.name || "");
  const [logo, setLogo] = useState<string>(pro.photo || "");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Seule la dernière image choisie compte (le générateur envoie chaque modification)
  const seq = useRef(0);
  const appliquer = (source: File | string) => {
    const n = ++seq.current;
    setError("");
    normaliserLogo(source)
      .then(l => { if (n === seq.current) setLogo(l); })
      .catch(err => { if (n === seq.current) setError(err.message); });
  };

  const enregistrer = async () => {
    if (!name.trim()) { setError("Le nom ne peut pas être vide."); return; }
    if (!logo) { setError("Le logo est obligatoire."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/professionals/admin/${pro.id}/identite`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
          name: name.trim(),
          // Seul un logo changé est envoyé
          ...(logo !== (pro.photo || "") ? { photo: logo } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setError(data.message || "Enregistrement impossible."); return; }
      onSaved({ id: pro.id, name: name.trim(), photo: logo });
      onClose();
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/55 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900 mb-4">✏️ Nom et logo de l'établissement</h3>

        <label className="block text-sm font-semibold text-gray-700 mb-1">Nom</label>
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" />

        <label className="block text-sm font-semibold text-gray-700 mb-2">Logo</label>
        <div className="flex items-center gap-4 mb-3">
          <div className="w-20 h-20 rounded-2xl overflow-hidden ring-1 ring-gray-200 flex-shrink-0">
            <LogoEtablissement src={logo} name={name} type={pro.type} fontSize={36} />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label className="cursor-pointer inline-flex items-center justify-center gap-2 min-h-[40px] px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
              📷 Importer une image
              <input type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) appliquer(f); e.target.value = ""; }} />
            </label>
            <button type="button" onClick={() => setShowPicker(v => !v)}
              className="min-h-[40px] px-3 py-2 rounded-lg border-2 border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-semibold">
              🎨 {showPicker ? "Fermer le générateur" : "Créer avec le générateur"}
            </button>
          </div>
        </div>

        {showPicker && (
          <LogoPicker
            typeId={pro.type}
            color={LOGO_COLORS[pro.type] || "#f59e0b"}
            defaultText={name.trim() || pro.name}
            onCancel={() => setShowPicker(false)}
            onChange={appliquer}
            onConfirm={dataUrl => { appliquer(dataUrl); setShowPicker(false); }}
          />
        )}

        {error && <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-semibold">⚠️ {error}</div>}

        <div className="flex gap-2 mt-4">
          <button type="button" onClick={enregistrer} disabled={saving}
            className="flex-1 min-h-[44px] px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold">
            {saving ? "Enregistrement…" : "✅ Enregistrer"}
          </button>
          <button type="button" onClick={onClose} disabled={saving}
            className="min-h-[44px] px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
