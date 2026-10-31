import { useRef, useState } from "react";
import { config } from "../config/api";
import { getPhotoUrl } from "../utils/auth";
import { AudioRecorder } from "./AudioRecorder";
import { useTraduction } from "../i18n/traduction";

/**
 * À côté de la photo d'un article (produit, plat, service, bien) dans une
 * gestion : 🎥 Vidéo et 🎤 Vocal. Un appui suffit : on filme ou on choisit une
 * vidéo, on parle ou on choisit un audio ; c'est enregistré sur le serveur et
 * montré sur le site (et dans Échange pour les commerçants). Une croix retire.
 */
const lireFichier = (f: Blob) => new Promise<string>((ok, ko) => {
  const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = ko; r.readAsDataURL(f);
});

const dureeVideo = (f: File) => new Promise<number>((resolve) => {
  const v = document.createElement("video");
  v.preload = "metadata";
  v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration); };
  v.onerror = () => { URL.revokeObjectURL(v.src); resolve(0); };
  v.src = URL.createObjectURL(f);
});

const DUREE_MAX_VIDEO = 60;

export default function MediasArticle({ tenantCode, articleId, videoUrl, audioUrl, couleur, taille = 72 }: {
  tenantCode: string;
  articleId: number | string;
  videoUrl?: string | null;
  audioUrl?: string | null;
  couleur: string;
  taille?: number;
}) {
  const { tr } = useTraduction();
  const [video, setVideo] = useState<string | null>(videoUrl || null);
  const [vocal, setVocal] = useState<string | null>(audioUrl || null);
  const [envoi, setEnvoi] = useState<"" | "video" | "vocal">("");
  const [enregistrer, setEnregistrer] = useState(false);
  const videoRef = useRef<HTMLInputElement>(null);

  const envoyer = async (genre: "video" | "vocal", fichier: Blob | null) => {
    setEnvoi(genre);
    try {
      const r = await fetch(`${config.API_BASE_URL}/site-mgmt/${encodeURIComponent(tenantCode)}/articles/${articleId}/media`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ genre, fichier: fichier ? await lireFichier(fichier) : null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) { alert(tr(d.message || "Rien n'a été enregistré. Réessayez.")); return; }
      if (genre === "video") setVideo(d.url || null); else setVocal(d.url || null);
    } catch {
      alert(tr("Connexion impossible : rien n'a été enregistré. Réessayez."));
    } finally {
      setEnvoi("");
    }
  };

  const tuile = {
    width: taille, height: taille, borderRadius: 12, border: `2px dashed ${couleur}66`, background: `${couleur}0d`,
    display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 2,
    fontSize: 11, fontWeight: 700, color: couleur, cursor: "pointer", position: "relative" as const, flexShrink: 0,
  };
  const croix = {
    position: "absolute" as const, top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", border: "none",
    background: "#ef4444", color: "#fff", fontWeight: 800, cursor: "pointer", lineHeight: "22px", padding: 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input ref={videoRef} type="file" accept="video/*" style={{ display: "none" }}
          onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = "";
            if (!f) return;
            if (await dureeVideo(f) > DUREE_MAX_VIDEO + 1) { alert(tr("La vidéo est trop longue : {n} secondes au maximum.", { n: DUREE_MAX_VIDEO })); return; }
            void envoyer("video", f);
          }} />
        {video ? (
          <div style={{ ...tuile, borderStyle: "solid", padding: 0, overflow: "hidden", background: "#000" }}>
            <video src={getPhotoUrl(video)} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline controls />
            <button type="button" style={croix} aria-label={tr("Retirer")} onClick={() => void envoyer("video", null)}>×</button>
          </div>
        ) : (
          <button type="button" style={tuile} disabled={!!envoi} onClick={() => videoRef.current?.click()}>
            <span style={{ fontSize: 24 }}>🎥</span>{envoi === "video" ? "…" : tr("Vidéo")}
          </button>
        )}
        {vocal ? (
          <div style={{ ...tuile, borderStyle: "solid", width: taille * 2 }}>
            <audio src={getPhotoUrl(vocal)} controls style={{ width: "92%" }} />
            <button type="button" style={croix} aria-label={tr("Retirer")} onClick={() => void envoyer("vocal", null)}>×</button>
          </div>
        ) : (
          <button type="button" style={tuile} disabled={!!envoi} onClick={() => setEnregistrer((o) => !o)}>
            <span style={{ fontSize: 24 }}>🎤</span>{envoi === "vocal" ? "…" : tr("Vocal")}
          </button>
        )}
      </div>
      {enregistrer && !vocal && (
        <AudioRecorder maxDuration={60} onAudioRecorded={(blob) => { setEnregistrer(false); void envoyer("vocal", blob); }} />
      )}
    </div>
  );
}
