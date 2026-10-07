import { useState } from "react";
import { getPhotoUrl } from "../utils/auth";

// Photo de profil ronde. Si la photo manque ou ne se charge plus, on affiche
// l'initiale dans un rond coloré — jamais une image cassée ni le nom en texte.
export default function PhotoProfil({ photo, prenom, nomFamille, className = "w-12 h-12" }: {
  photo?: string | null;
  prenom?: string;
  nomFamille?: string;
  className?: string;
}) {
  const [cassee, setCassee] = useState(false);
  const url = cassee ? null : getPhotoUrl(photo || undefined);
  const initiale = (prenom || nomFamille || "?").trim().charAt(0).toUpperCase();
  return url ? (
    <img src={url} alt="" onError={() => setCassee(true)} className={`${className} rounded-full object-cover bg-emerald-100`} />
  ) : (
    <div aria-hidden className={`${className} rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center`}>
      {initiale}
    </div>
  );
}
