import { useState } from "react";
import { lienInvitationPro, messageInvitation, lienWhatsApp } from "../utils/invitationPro";
import { copierTexte } from "../utils/lienAppGestion";

// Le lien d'invitation, avec les moyens de l'envoyer au pro (même à distance)
export default function EnvoiInvitationPro({ token, nom, telephone, email }: { token: string; nom: string; telephone?: string; email?: string }) {
  const [copie, setCopie] = useState(false);
  const lien = lienInvitationPro(token);
  const texte = messageInvitation(nom, lien);
  const btn = "flex-1 min-w-[140px] text-center px-3 py-2.5 rounded-xl text-sm font-bold";
  return (
    <div className="mt-3">
      <div className="text-xs text-gray-500 mb-1">Lien d'invitation (valable 30 jours, une seule fois) :</div>
      <div className="text-xs font-mono break-all bg-gray-50 border border-gray-200 rounded-lg p-2 mb-3">{lien}</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${btn} bg-gray-900 text-white`}
          onClick={async () => { await copierTexte(texte); setCopie(true); setTimeout(() => setCopie(false), 2500); }}>
          {copie ? "✅ Message copié" : "📋 Copier le message"}
        </button>
        {telephone && (
          <a className={`${btn} text-white`} style={{ background: "#25D366" }} href={lienWhatsApp(telephone, texte)} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        )}
        {email && (
          <a className={`${btn} bg-white border border-gray-300 text-gray-800`}
            href={`mailto:${email}?subject=${encodeURIComponent(`Votre espace ${nom} sur Moftal`)}&body=${encodeURIComponent(texte)}`}>
            ✉️ E-mail
          </a>
        )}
      </div>
    </div>
  );
}
