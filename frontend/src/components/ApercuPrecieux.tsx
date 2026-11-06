import { useState } from 'react';
import { useTraduction } from '../i18n/traduction';

// Aperçu admin de la page Amitié avec 💎 Précieux : des amis d'exemple,
// manipulables à l'écran, pour voir à quoi ressemble la page d'un membre.
// Rien n'est envoyé au serveur — aucune donnée de membre n'est montrée.

interface AmiExemple {
  id: string;
  nom: string;
  initiale: string;
  memeSexe: boolean;
  parMoi: boolean;
  parLui: boolean;
}

const AMIS_EXEMPLE: AmiExemple[] = [
  { id: 'mariama', nom: 'Mariama Bah', initiale: 'M', memeSexe: true, parMoi: true, parLui: true },
  { id: 'fatou', nom: 'Fatou Diallo', initiale: 'F', memeSexe: true, parMoi: false, parLui: true },
  { id: 'awa', nom: 'Awa Sow', initiale: 'A', memeSexe: true, parMoi: false, parLui: false },
  { id: 'mamadou', nom: 'Mamadou Camara', initiale: 'M', memeSexe: false, parMoi: false, parLui: false },
];

const SOUVENIRS_EXEMPLE = [
  { emoji: '🌙', fond: 'from-indigo-400 to-purple-500' },
  { emoji: '🎓', fond: 'from-sky-400 to-blue-500' },
  { emoji: '✈️', fond: 'from-emerald-400 to-teal-500' },
  { emoji: '💍', fond: 'from-amber-400 to-yellow-500' },
  { emoji: '🍲', fond: 'from-rose-400 to-pink-500' },
  { emoji: '🤝', fond: 'from-orange-400 to-red-500' },
];

export default function ApercuPrecieux() {
  const { tr } = useTraduction();
  const [amis, setAmis] = useState(AMIS_EXEMPLE);
  const [galerie, setGalerie] = useState<AmiExemple | null>(null);

  const changer = (id: string, actif: boolean) =>
    setAmis((liste) => liste.map((a) => (a.id !== id ? a : actif ? { ...a, parMoi: true } : { ...a, parMoi: false, parLui: false })));

  const precieux = amis.filter((a) => a.parMoi && a.parLui);
  const connaissances = amis.filter((a) => !(a.parMoi && a.parLui));
  const choisiParEux = amis.filter((a) => a.memeSexe && a.parLui && !a.parMoi);

  const carte = (a: AmiExemple) => {
    const estPrecieux = a.parMoi && a.parLui;
    return (
      <div key={a.id} className={`border rounded-xl p-3 flex items-center gap-3 ${estPrecieux ? 'border-amber-200 bg-amber-50/60' : 'border-gray-100'}`}>
        <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">{a.initiale}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {a.nom}{estPrecieux && <span className="ml-1">💎</span>}
          </p>
          <p className="text-xs text-gray-500">{tr('Ami(e)')}</p>
        </div>
        {estPrecieux ? (
          <button type="button" onClick={() => setGalerie(a)} aria-label={tr('Galerie souvenirs')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-amber-100 hover:bg-amber-200 text-lg">🖼️</button>
        ) : a.memeSexe && (
          <button type="button" onClick={() => changer(a.id, !a.parMoi)}
            title={a.parMoi ? tr("Choisi — en attente de l'autre") : tr('Choisir comme précieux')}
            className={`w-9 h-9 flex items-center justify-center rounded-full text-lg ${a.parMoi ? 'bg-amber-50 opacity-60' : 'bg-gray-100 text-gray-400'}`}>
            {a.parMoi ? '💎' : '♢'}
          </button>
        )}
        {estPrecieux && (
          <button type="button" onClick={() => changer(a.id, false)} title={tr('Remettre en connaissance')}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-sm">👥</button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-amber-200 rounded-2xl p-4 mb-5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h2 className="font-bold text-gray-900">💎 {tr('Aperçu : la page Amitié d\'un membre')}</h2>
        <button type="button" onClick={() => { setAmis(AMIS_EXEMPLE); setGalerie(null); }}
          className="shrink-0 text-xs text-amber-700 border border-amber-200 rounded-lg px-2 py-1">↺ {tr('Recommencer')}</button>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        {tr('Amis d\'exemple : touchez ♢, « Moi aussi », 🖼️ et 👥 pour voir chaque étape. Rien n\'est enregistré.')}
      </p>

      <div className="space-y-3">
        {choisiParEux.map((a) => (
          <div key={`choix-${a.id}`} className="border border-amber-200 bg-amber-50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">{a.initiale}</div>
            <p className="flex-1 min-w-0 text-sm text-gray-900">💎 <span className="font-semibold">{a.nom}</span> {tr("t'a choisi(e)")}</p>
            <button type="button" onClick={() => changer(a.id, true)}
              className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white py-2 px-3 rounded-lg font-bold text-xs">💎 {tr('Moi aussi')}</button>
          </div>
        ))}

        {precieux.length > 0 && (
          <>
            <h3 className="pt-2 text-sm font-bold text-amber-700">💎 {tr('Précieux')} ({precieux.length})</h3>
            {precieux.map(carte)}
          </>
        )}
        {connaissances.length > 0 && (
          <>
            <h3 className="pt-2 text-sm font-bold text-gray-600">👥 {tr('Connaissances')} ({connaissances.length})</h3>
            {connaissances.map(carte)}
          </>
        )}
      </div>

      <ul className="mt-4 text-xs text-gray-500 space-y-1">
        <li>♢ {tr('ami du même sexe, pas encore choisi')}</li>
        <li>💎 {tr('pâle : choisi par moi, en attente de l\'autre')}</li>
        <li>💎 🖼️ {tr('choisis tous les deux : amis précieux, galerie ouverte')}</li>
        <li>{tr('Rien : ami de l\'autre sexe (simple connaissance)')}</li>
      </ul>

      {galerie && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" onClick={() => setGalerie(null)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 p-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-rose-50 rounded-t-2xl">
              <h3 className="font-bold text-gray-900 truncate">🖼️ {galerie.nom}</h3>
              <button type="button" onClick={() => setGalerie(null)}
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-white text-gray-600 border border-gray-200">✕</button>
            </div>
            <div className="p-3 grid grid-cols-3 gap-1.5">
              {SOUVENIRS_EXEMPLE.map((s) => (
                <div key={s.emoji} className={`aspect-square rounded-lg bg-gradient-to-br ${s.fond} flex items-center justify-center text-4xl`}>{s.emoji}</div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-100">
              <div className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl text-center opacity-70">➕ {tr('Ajouter un souvenir')}</div>
              <p className="text-[11px] text-gray-400 text-center mt-2">{tr('Aperçu : souvenirs d\'exemple, rien n\'est enregistré.')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
