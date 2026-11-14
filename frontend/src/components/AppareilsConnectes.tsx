import { useCallback, useEffect, useState } from "react";
import { api, type AppareilConnecte } from "../utils/api";

// « Mes appareils connectés » : la liste des téléphones, tablettes et ordinateurs
// où le compte est ouvert, enregistrée sur le serveur. On peut déconnecter un
// appareil (téléphone perdu, prêté…) ou tous les autres, à distance.

function icone(appareil: string) {
  if (/Ordinateur/i.test(appareil)) return "💻";
  if (/Tablette/i.test(appareil)) return "📱";
  return "📱";
}

function depuis(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 10) return "actif maintenant";
  if (min < 60) return `actif il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `actif il y a ${h} h`;
  const j = Math.floor(h / 24);
  return j === 1 ? "actif hier" : `actif il y a ${j} jours`;
}

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-GN", { day: "numeric", month: "long", year: "numeric" });

export function AppareilsConnectes({ onClose }: { onClose: () => void }) {
  const [appareils, setAppareils] = useState<AppareilConnecte[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setErreur("");
    const r = await api.listerAppareils();
    if (r.success) setAppareils(r.sessions || []);
    else setErreur(r.message || "Impossible de charger vos appareils.");
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const deconnecter = async (a: AppareilConnecte) => {
    if (!window.confirm(`Déconnecter « ${a.appareil} » ? Il devra se reconnecter avec le mot de passe.`)) return;
    setEnCours(a.id); setInfo(""); setErreur("");
    const r = await api.deconnecterAppareil(a.id);
    setEnCours(null);
    if (r.success) { setInfo(`« ${a.appareil} » a été déconnecté.`); charger(); }
    else setErreur(r.message || "L'appareil n'a pas pu être déconnecté.");
  };

  const deconnecterAutres = async () => {
    if (!window.confirm("Déconnecter tous vos autres appareils ? Seul cet appareil restera connecté.")) return;
    setEnCours("autres"); setInfo(""); setErreur("");
    const r = await api.deconnecterAutresAppareils();
    setEnCours(null);
    if (r.success) { setInfo("Tous vos autres appareils ont été déconnectés."); charger(); }
    else setErreur(r.message || "Les autres appareils n'ont pas pu être déconnectés.");
  };

  const autres = (appareils || []).filter((a) => !a.actuel);

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50" onClick={() => !enCours && onClose()}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="text-lg font-semibold text-slate-800">📱 Mes appareils connectés</h3>
          <p className="text-sm text-slate-600 mt-1">
            Les appareils où votre compte est ouvert. Si vous ne reconnaissez pas un appareil,
            ou si votre téléphone est perdu, déconnectez-le puis changez votre mot de passe.
          </p>
        </div>

        {erreur && <p className="text-sm text-red-600">{erreur}</p>}
        {info && <p className="text-sm text-green-600">{info}</p>}

        {!appareils && !erreur && (
          <div className="flex justify-center py-6">
            <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}

        {appareils && (
          <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
            {appareils.length === 0 && (
              <li className="p-3 text-sm text-slate-500">Aucun appareil enregistré pour l'instant.</li>
            )}
            {appareils.map((a) => (
              <li key={a.id} className="flex items-center gap-3 p-3">
                <span className="text-2xl" aria-hidden>{icone(a.appareil)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {a.appareil}
                    {a.actuel && <span className="ml-2 text-xs font-bold text-green-700 bg-green-100 rounded px-1.5 py-0.5">Cet appareil</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.actuel ? "actif maintenant" : depuis(a.derniereActivite)} · connecté le {date(a.connecteLe)}
                  </p>
                </div>
                {!a.actuel && (
                  <button
                    type="button"
                    onClick={() => deconnecter(a)}
                    disabled={!!enCours}
                    className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 disabled:opacity-50"
                  >
                    {enCours === a.id ? "…" : "Déconnecter"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={!!enCours}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium"
          >
            Fermer
          </button>
          {autres.length > 0 && (
            <button
              type="button"
              onClick={deconnecterAutres}
              disabled={!!enCours}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {enCours === "autres" ? "Déconnexion…" : "Déconnecter tous les autres"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
