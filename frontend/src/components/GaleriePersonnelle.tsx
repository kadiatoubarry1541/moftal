import { useCallback, useEffect, useState } from "react";
import GalerieAlbum from "./GalerieAlbum";
import OffreGalerie from "./OffreGalerie";
import { avertirOffre, ajouterDureeVideo, type Offre } from "../utils/offreGaleries";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5002";

interface Media { id: string; url: string; type: string }

const lien = (url: string) => (url.startsWith("http") || url.startsWith("data:") ? url : `${API_BASE}${url}`);
const entetes = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

/**
 * Ma galerie personnelle 🔒 (Noyau → carte « Moi ») : visible uniquement par
 * son propriétaire. Offre : 3 photos + 1 vidéo gratuites ; supprimer ou
 * remplacer libère une place, au-delà on paie avec ses points.
 */
export default function GaleriePersonnelle({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<Media[]>([]);
  const [offre, setOffre] = useState<Offre | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const appliquer = (data: { items?: Media[]; offre?: Offre }) => {
    setItems(data.items || []);
    setOffre(data.offre || null);
  };

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur("");
    try {
      const res = await fetch(`${API_BASE}/api/family/personal-gallery`, { headers: entetes() });
      const data = await res.json();
      if (res.ok && data.success) appliquer(data);
      else setErreur(data.message || "Impossible de charger votre galerie.");
    } catch {
      setErreur("Impossible de charger votre galerie : vérifiez votre connexion.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  // Envoi d'un fichier (ajout, ou remplacement d'un élément)
  const envoyer = async (fichier: File, id?: string) => {
    const form = new FormData();
    form.append("media", fichier);
    await ajouterDureeVideo(form, fichier);
    const res = await fetch(`${API_BASE}/api/family/personal-gallery${id ? `/${id}` : ""}`, {
      method: id ? "PUT" : "POST", headers: entetes(), body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) { appliquer(data); return true; }
    avertirOffre(data, "Le fichier n'a pas été enregistré. Réessayez.");
    return false;
  };

  const ajouter = async (fichiers: File[]) => {
    setEnvoi(true);
    try {
      for (const f of fichiers) {
        try { if (!(await envoyer(f))) break; }
        catch { alert("Le fichier n'a pas été enregistré : vérifiez votre connexion."); break; }
      }
    } finally {
      setEnvoi(false);
    }
  };

  const remplacer = async (id: string, fichier: File) => {
    try { await envoyer(fichier, id); }
    catch { alert("Le remplacement n'a pas été enregistré : vérifiez votre connexion."); }
  };

  const supprimer = async (ids: string[]) => {
    let echec = "";
    for (const id of ids) {
      try {
        const res = await fetch(`${API_BASE}/api/family/personal-gallery/${id}`, { method: "DELETE", headers: entetes() });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) appliquer(data);
        else echec = data.message || "La suppression n'a pas été enregistrée.";
      } catch {
        echec = "La suppression n'a pas été enregistrée : vérifiez votre connexion.";
      }
    }
    if (echec) alert(echec);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
      <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-3 py-3 shadow flex-shrink-0"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <button type="button" onClick={onClose} className="text-3xl leading-none px-2" aria-label="Retour au Noyau">‹</button>
        <div className="min-w-0 flex-1">
          <p className="font-bold truncate">🔒 Ma galerie personnelle</p>
          <p className="text-xs text-emerald-100">Visible uniquement par vous</p>
        </div>
        <label className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold flex-shrink-0 ${
          envoi || chargement ? "bg-white/30 cursor-not-allowed" : "bg-white text-emerald-700 cursor-pointer active:scale-95"}`}>
          {envoi ? "Envoi…" : "＋ Ajouter"}
          <input type="file" accept="image/*,video/*" multiple className="hidden" disabled={envoi || chargement}
            onChange={(e) => { const f = Array.from(e.target.files || []); e.target.value = ""; if (f.length) ajouter(f); }} />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <OffreGalerie offre={offre} />
        </div>
        {chargement ? (
          <p className="p-8 text-center text-emerald-600">Chargement de votre galerie…</p>
        ) : erreur ? (
          <div className="p-8 text-center">
            <p className="text-red-600 text-sm mb-3">{erreur}</p>
            <button type="button" onClick={charger} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold">Réessayer</button>
          </div>
        ) : (
          <GalerieAlbum
            elements={items.map((m) => ({ cle: m.id, url: lien(m.url), video: m.type === "video", supprimable: true }))}
            onSupprimer={supprimer}
            onRemplacer={remplacer}
            vide={
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-gray-600">
                <span className="text-7xl mb-4 opacity-30">🔒</span>
                <p className="text-sm font-medium text-gray-500">Votre galerie personnelle est vide.</p>
                <p className="text-xs text-gray-500 mt-1">Vos photos et vidéos ici ne sont vues que par vous. Appuyez sur « ＋ Ajouter ».</p>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
