import { useState } from "react";
import { lienMessage } from "../utils/invitationPro";
import { copierTexte } from "../utils/lienAppGestion";
import { useTraduction } from "../i18n/traduction";

// Le lien de l'application et les moyens de l'envoyer (copier, message, e-mail)
export default function EnvoiLien({ lien, message, telephone, email, sujet, legende }: {
  lien: string; message: string; telephone?: string | null; email?: string | null; sujet: string; legende?: string;
}) {
  const [copie, setCopie] = useState(false);
  const { tr } = useTraduction();
  const btn = "flex-1 min-w-[130px] text-center px-3 py-2.5 rounded-xl text-sm font-bold";
  return (
    <div className="mt-3">
      <div className="text-xs text-gray-500 mb-1">{legende || tr("Lien de l'application :")}</div>
      <div className="text-xs font-mono break-all bg-gray-50 border border-gray-200 rounded-lg p-2 mb-3">{lien}</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${btn} bg-gray-900 text-white`}
          onClick={async () => { await copierTexte(message); setCopie(true); setTimeout(() => setCopie(false), 2500); }}>
          {copie ? tr("✅ Message copié") : tr("📋 Copier le message")}
        </button>
        {telephone && (
          <a className={`${btn} text-white`} style={{ background: "#25D366" }} href={lienMessage(telephone, message)} target="_blank" rel="noreferrer">{tr("📲 Message")}</a>
        )}
        {email && (
          <a className={`${btn} bg-white border border-gray-300 text-gray-800`}
            href={`mailto:${email}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(message)}`}>{tr("✉️ E-mail")}</a>
        )}
      </div>
    </div>
  );
}
