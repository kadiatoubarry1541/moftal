import { getPhotoUrl } from "../utils/auth";
import GaleriePhotosSite from "./ecole/GaleriePhotosSite";
import type { PhotoSite } from "./ecole/PhotosSite";
import { useTraduction } from "../i18n/traduction";

// Photos ajoutées par le pro (Espace Pro → Photos du site), sur son site :
// une grande photo de couverture en haut, et la galerie plus bas.

/** Grande photo en haut du site (celle marquée « couverture », sinon la plus récente). */
export function CouverturePhotoSite({ photos, nom }: { photos: PhotoSite[]; nom?: string }) {
  const couverture = photos.find(p => p.est_couverture) || photos[0];
  if (!couverture) return null;
  return (
    <div style={{ position: "relative", height: "clamp(220px, 45vw, 480px)", background: "#0f172a", overflow: "hidden" }}>
      <img src={getPhotoUrl(couverture.image_url) || ""} alt={couverture.legende || nom || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {couverture.legende && (
        <span style={{ position: "absolute", insetInline: 0, bottom: 0, padding: "40px 20px 14px", background: "linear-gradient(transparent, rgba(15,23,42,0.7))", color: "white", fontSize: 14, fontWeight: 600, textAlign: "center" }}>{couverture.legende}</span>
      )}
    </div>
  );
}

/** Galerie « en images » (rien n'est affiché tant qu'il n'y a pas de photo). */
export function GalerieVitrine({ photos, couleur }: { photos: PhotoSite[]; couleur: string }) {
  const { tr } = useTraduction();
  return <GaleriePhotosSite photos={photos} couleur={couleur} sousTitre={tr("Découvrez nos produits, nos services, nos réalisations et nos locaux.")} />;
}
