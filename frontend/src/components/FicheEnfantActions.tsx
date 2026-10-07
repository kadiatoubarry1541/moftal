import { useEffect, useState } from "react";
import AjouterEnfantModal, { type FicheEnfant } from "./AjouterEnfantModal";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5002";

type User = { numeroH: string; prenom?: string; nomFamille?: string; genre?: string } | null;

async function appel(chemin: string, method = "GET", body?: unknown) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/api/parent-child${chemin}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message || "Erreur");
  return data;
}

interface Correspondance { numeroH: string; prenom: string; nomFamille?: string; photo?: string | null }

/** Actions sur la fiche d'un enfant sans compte : modifier, retirer, relier à son compte. */
export function FicheEnfantActions({ fiche, user, onChange }: { fiche: FicheEnfant; user: User; onChange: () => void }) {
  const [modifier, setModifier] = useState(false);
  const [correspondances, setCorrespondances] = useState<Correspondance[]>([]);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    if (fiche.estVivant === false) return;
    appel(`/enfants-sans-compte/${fiche.ficheId}/correspondances`)
      .then((d) => setCorrespondances(d.correspondances || []))
      .catch(() => {});
  }, [fiche.ficheId, fiche.estVivant]);

  const retirer = async () => {
    if (!window.confirm(`Retirer ${fiche.prenom} de votre famille ? (à faire seulement en cas d'erreur)`)) return;
    setOccupe(true);
    try { await appel(`/enfants-sans-compte/${fiche.ficheId}`, "DELETE"); onChange(); }
    catch (e) { alert((e as Error).message); }
    finally { setOccupe(false); }
  };

  const relier = async (c: Correspondance) => {
    if (!window.confirm(`${c.prenom} ${c.nomFamille || ""} est-il/elle bien votre enfant « ${fiche.prenom} » ? Sa fiche sera reliée à son compte.`)) return;
    setOccupe(true);
    try { const d = await appel(`/enfants-sans-compte/${fiche.ficheId}/fusionner`, "POST", { numeroH: c.numeroH }); alert(d.message); onChange(); }
    catch (e) { alert((e as Error).message); }
    finally { setOccupe(false); }
  };

  return (
    <div className="mt-2 space-y-2">
      {correspondances.map((c) => (
        <div key={c.numeroH} className="rounded-lg bg-sky-50 border border-sky-200 p-2.5 text-xs text-sky-900">
          <p><strong>{c.prenom} {c.nomFamille}</strong> a créé son compte Moftal (même prénom, même date de naissance). Est-ce votre enfant ?</p>
          <button type="button" disabled={occupe} onClick={() => relier(c)} className="mt-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold disabled:opacity-60">
            Oui, relier à son compte
          </button>
        </div>
      ))}
      <div className="flex justify-end gap-4">
        <button type="button" onClick={() => setModifier(true)} className="text-sm text-emerald-700 font-semibold">✏️ Modifier</button>
        <button type="button" disabled={occupe} onClick={retirer} className="text-sm text-red-600 disabled:opacity-50">Retirer</button>
      </div>
      {modifier && (
        <AjouterEnfantModal user={user} fiche={fiche} onClose={() => setModifier(false)}
          onSaved={(m) => { setModifier(false); alert(m); onChange(); }} />
      )}
    </div>
  );
}

/** Fiche déjà reliée au compte de l'enfant : un parent peut annuler si c'est une erreur. */
export function AnnulerFusionFiche({ ficheId, onChange }: { ficheId: string; onChange: () => void }) {
  const [occupe, setOccupe] = useState(false);
  const annuler = async () => {
    if (!window.confirm("Ce compte n'est pas votre enfant ? La fiche que vous aviez créée redeviendra comme avant.")) return;
    setOccupe(true);
    try { const d = await appel(`/enfants-sans-compte/${ficheId}/annuler-fusion`, "POST"); alert(d.message); onChange(); }
    catch (e) { alert((e as Error).message); }
    finally { setOccupe(false); }
  };
  return (
    <button type="button" disabled={occupe} onClick={annuler} className="text-xs text-slate-500 underline disabled:opacity-50">
      Ce n'est pas mon enfant ? Annuler la fusion
    </button>
  );
}

/**
 * L'enfant devenu grand retrouve la fiche créée par ses parents avec son extrait
 * de naissance (numéro + commune + année) — sa date de naissance (profil) doit
 * aussi correspondre. Son arbre est alors fusionné avec celui de ses parents.
 */
export function RejoindreMaFiche({ onDone }: { onDone?: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [numero, setNumero] = useState("");
  const [commune, setCommune] = useState("");
  const [annee, setAnnee] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const envoyer = async (confirmer = false) => {
    if (!numero.trim() || !commune.trim() || !/^\d{4}$/.test(annee.trim())) {
      setMessage({ ok: false, texte: "Remplissez le numéro, la commune et l'année (4 chiffres) de votre extrait de naissance." });
      return;
    }
    setOccupe(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/parent-child/rejoindre-ma-fiche`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ extraitNumero: numero.trim(), extraitCommune: commune.trim(), extraitAnnee: annee.trim(), ...(confirmer ? { confirmer: true } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.code === "CONFIRMER_PRENOM") {
        if (window.confirm(data.message)) return envoyer(true);
        setMessage({ ok: false, texte: "Vérifiez avec vos parents les informations de l'extrait." });
        return;
      }
      setMessage({ ok: !!data.success, texte: data.message || "Erreur" });
      if (data.success) onDone?.();
    } catch {
      setMessage({ ok: false, texte: "Erreur de connexion. Réessayez." });
    } finally {
      setOccupe(false);
    }
  };

  const champ = "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
  return (
    <div className="bg-white rounded-xl border border-emerald-200 mb-4">
      <button type="button" onClick={() => setOuvert((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-semibold text-emerald-800">👶 Vos parents vous ont inscrit(e) quand vous étiez enfant ?</span>
        <span className="text-slate-400">{ouvert ? "▲" : "▼"}</span>
      </button>
      {ouvert && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs text-slate-500">
            Entrez les informations de votre <strong>extrait de naissance</strong>. Si elles correspondent à la fiche créée
            par vos parents (avec votre date de naissance), votre compte est relié à eux et vos arbres sont fusionnés.
          </p>
          <input className={champ} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Numéro de l'extrait (ex : 125)" />
          <input className={champ} value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="Commune de l'extrait (ex : Dabola)" />
          <input className={champ} inputMode="numeric" maxLength={4} value={annee} onChange={(e) => setAnnee(e.target.value.replace(/\D/g, ""))} placeholder="Année de l'extrait (ex : 2015)" />
          {message && <p className={`text-sm rounded-lg px-3 py-2 ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{message.texte}</p>}
          <button type="button" disabled={occupe} onClick={() => envoyer()} className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-60">
            {occupe ? "Recherche…" : "Retrouver ma fiche"}
          </button>
        </div>
      )}
    </div>
  );
}
