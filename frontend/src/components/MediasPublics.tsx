import { getPhotoUrl } from "../utils/auth";

/** Sur le site d'un établissement : la vidéo et le message vocal d'un article,
 *  sous sa photo (rien ne s'affiche s'il n'y en a pas). */
export default function MediasPublics({ videoUrl, audioUrl }: { videoUrl?: string | null; audioUrl?: string | null }) {
  if (!videoUrl && !audioUrl) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
      {videoUrl && (
        <video src={getPhotoUrl(videoUrl) || ""} controls playsInline preload="metadata"
          style={{ width: "100%", maxHeight: 220, borderRadius: 10, background: "#000" }} />
      )}
      {audioUrl && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18 }}>🎤</span>
          <audio src={getPhotoUrl(audioUrl) || ""} controls preload="none" style={{ flex: 1, minWidth: 0, height: 36 }} />
        </div>
      )}
    </div>
  );
}
