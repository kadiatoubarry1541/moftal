import { useMemo, useState } from "react";
import MicroVocal from "./MicroVocal";
import { useTraduction } from "../i18n/traduction";

/**
 * Barre d'envoi simple, sans « type » à choisir avant : on écrit, ou on joint
 * une photo / une vidéo / un audio (📎) puis ➤ ; ou on touche 🎤 pour
 * enregistrer un message vocal, envoyé directement avec ➤.
 * Le texte accompagne le fichier s'il y en a un.
 */
export default function BarreMessage({ onEnvoyer, placeholder, desactive }: {
  /** Renvoie true si l'envoi a réussi (la barre se vide alors) */
  onEnvoyer: (envoi: { texte: string; fichier: File | null }) => Promise<boolean>;
  placeholder?: string;
  desactive?: boolean;
}) {
  const { tr } = useTraduction();
  const [texte, setTexte] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const apercu = useMemo(() => (fichier && fichier.type.startsWith("image/") ? URL.createObjectURL(fichier) : null), [fichier]);

  const envoyer = async () => {
    if (envoi || desactive || (!texte.trim() && !fichier)) return;
    setEnvoi(true);
    try {
      if (await onEnvoyer({ texte: texte.trim(), fichier })) { setTexte(""); setFichier(null); }
    } finally { setEnvoi(false); }
  };

  const icone = !fichier ? "" : fichier.type.startsWith("video/") ? "🎥" : fichier.type.startsWith("audio/") ? "🎤" : "🖼️";

  return (
    <div className="space-y-2">
      {fichier && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-2xl">
          {apercu ? <img src={apercu} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <span className="text-2xl">{icone}</span>}
          <span className="flex-1 min-w-0 truncate text-sm text-green-800">
            {fichier.type.startsWith("audio/") ? tr("Message vocal prêt") : fichier.type.startsWith("video/") ? tr("Vidéo prête") : tr("Photo prête")}
          </span>
          <button type="button" onClick={() => setFichier(null)} aria-label={tr("Retirer")}
            className="w-7 h-7 rounded-full bg-red-500 text-white text-sm font-bold">×</button>
        </div>
      )}
      <div className="relative flex gap-2 items-center">
        <label className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-xl cursor-pointer" title={tr("Photo, vidéo ou audio")}>
          📎
          <input type="file" accept="image/*,video/*,audio/*" className="hidden" disabled={desactive}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setFichier(f); }} />
        </label>
        {/* Micro : touche → enregistre, ➤ envoie directement (30 s max) */}
        <MicroVocal
          onEnvoyer={(f) => onEnvoyer({ texte: "", fichier: f })}
          desactive={desactive}
          couleur="#16a34a"
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full text-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
        />
        <input type="text" value={texte} onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void envoyer(); }}
          placeholder={placeholder || tr("Écrivez un message...")} disabled={desactive}
          className="flex-1 min-w-0 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        <button type="button" onClick={() => void envoyer()} disabled={envoi || desactive || (!texte.trim() && !fichier)}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-full text-lg">
          {envoi ? "…" : "➤"}
        </button>
      </div>
    </div>
  );
}
