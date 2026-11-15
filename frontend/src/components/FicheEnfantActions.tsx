import { useEffect, useState } from "react";
import AjouterEnfantModal, { type FicheEnfant } from "./AjouterEnfantModal";
import { useTraduction, trHors } from "../i18n/traduction";

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
  if (!res.ok || data.success === false) throw new Error(trHors(data.message || "Erreur"));
  return data;
}

interface Correspondance { numeroH: string; prenom: string; nomFamille?: string; photo?: string | null }

/** Actions sur la fiche d'un enfant sans compte : modifier, retirer, relier à son compte. */
export function FicheEnfantActions({ fiche, user, onChange }: { fiche: FicheEnfant; user: User; onChange: () => void }) {
  const { tr } = useTraduction();
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
    if (!window.confirm(tr("Retirer {prenom} de votre famille ? (à faire seulement en cas d'erreur)", { prenom: fiche.prenom }))) return;
    setOccupe(true);
    try { await appel(`/enfants-sans-compte/${fiche.ficheId}`, "DELETE"); onChange(); }
    catch (e) { alert((e as Error).message); }
    finally { setOccupe(false); }
  };

  const relier = async (c: Correspondance) => {
    if (!window.confirm(tr("{prenom} {nom} est-il/elle bien votre enfant « {enfant} » ? Sa fiche sera reliée à son compte.", { prenom: c.prenom, nom: c.nomFamille || "", enfant: fiche.prenom }))) return;
    setOccupe(true);
    try { const d = await appel(`/enfants-sans-compte/${fiche.ficheId}/fusionner`, "POST", { numeroH: c.numeroH }); alert(tr(d.message)); onChange(); }
    catch (e) { alert((e as Error).message); }
    finally { setOccupe(false); }
  };

  return (
    <div className="mt-2 space-y-2">
      {correspondances.map((c) => (
        <div key={c.numeroH} className="rounded-lg bg-sky-50 border border-sky-200 p-2.5 text-xs text-sky-900">
          <p><strong>{c.prenom} {c.nomFamille}</strong> {tr("a créé son compte Moftal (même prénom, même date de naissance). Est-ce votre enfant ?")}</p>
          <button type="button" disabled={occupe} onClick={() => relier(c)} className="mt-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold disabled:opacity-60">
            {tr("Oui, relier à son compte")}
          </button>
        </div>
      ))}
      <div className="flex justify-end gap-4">
        <button type="button" onClick={() => setModifier(true)} className="text-sm text-emerald-700 font-semibold">{tr("✏️ Modifier")}</button>
        <button type="button" disabled={occupe} onClick={retirer} className="text-sm text-red-600 disabled:opacity-50">{tr("Retirer")}</button>
      </div>
      {modifier && (
        <AjouterEnfantModal user={user} fiche={fiche} onClose={() => setModifier(false)}
          onSaved={(m) => { setModifier(false); alert(tr(m)); onChange(); }} />
      )}
    </div>
  );
}

/** Fiche déjà reliée au compte de l'enfant : un parent peut annuler si c'est une erreur. */
export function AnnulerFusionFiche({ ficheId, onChange }: { ficheId: string; onChange: () => void }) {
  const { tr } = useTraduction();
  const [occupe, setOccupe] = useState(false);
  const annuler = async () => {
    if (!window.confirm(tr("Ce compte n'est pas votre enfant ? La fiche que vous aviez créée redeviendra comme avant."))) return;
    setOccupe(true);
    try { const d = await appel(`/enfants-sans-compte/${ficheId}/annuler-fusion`, "POST"); alert(tr(d.message)); onChange(); }
    catch (e) { alert((e as Error).message); }
    finally { setOccupe(false); }
  };
  return (
    <button type="button" disabled={occupe} onClick={annuler} className="text-xs text-slate-500 underline disabled:opacity-50">
      {tr("Ce n'est pas mon enfant ? Annuler la fusion")}
    </button>
  );
}

/**
 * L'enfant devenu grand demande à récupérer la fiche créée par ses parents, avec
 * le numéro de l'hôpital ou de la mairie (numéro + établissement + année) — sa
 * date de naissance (profil) doit aussi correspondre. Un parent confirme, puis
 * son compte est relié à sa famille.
 */
export function RejoindreMaFiche({ onDone }: { onDone?: () => void }) {
  const { tr } = useTraduction();
  const [ouvert, setOuvert] = useState(false);
  const [pieceType, setPieceType] = useState<"mairie" | "hopital">("mairie");
  const [numero, setNumero] = useState("");
  const [commune, setCommune] = useState("");
  const [annee, setAnnee] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const envoyer = async (confirmer = false) => {
    if (!numero.trim() || !commune.trim() || !/^\d{4}$/.test(annee.trim())) {
      setMessage({ ok: false, texte: pieceType === "hopital"
        ? tr("Remplissez le numéro, le nom de l'hôpital et l'année (4 chiffres).")
        : tr("Remplissez le numéro, la commune et l'année (4 chiffres) de votre extrait de naissance.") });
      return;
    }
    setOccupe(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/parent-child/rejoindre-ma-fiche`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ pieceType, extraitNumero: numero.trim(), extraitCommune: commune.trim(), extraitAnnee: annee.trim(), ...(confirmer ? { confirmer: true } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.code === "CONFIRMER_PRENOM") {
        if (window.confirm(tr(data.message))) return envoyer(true);
        setMessage({ ok: false, texte: tr("Vérifiez ces informations avec vos parents.") });
        return;
      }
      setMessage({ ok: !!data.success, texte: tr(data.message || "Erreur") });
      if (data.success) onDone?.();
    } catch {
      setMessage({ ok: false, texte: tr("Erreur de connexion. Réessayez.") });
    } finally {
      setOccupe(false);
    }
  };

  const champ = "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
  return (
    <div className="bg-white rounded-xl border border-emerald-200 mb-4">
      <button type="button" onClick={() => setOuvert((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-semibold text-emerald-800">{tr("👶 Vos parents vous ont inscrit(e) quand vous étiez enfant ?")}</span>
        <span className="text-slate-400">{ouvert ? "▲" : "▼"}</span>
      </button>
      {ouvert && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs text-slate-500">
            {tr("Entrez le numéro que vos parents ont donné : celui de l'hôpital ou celui de la mairie. Si tout correspond (avec votre date de naissance), vos parents reçoivent votre demande. Dès que l'un d'eux confirme, votre compte est relié à votre famille.")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["mairie", "hopital"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setPieceType(t)}
                className={`py-2 rounded-lg text-sm font-semibold border ${pieceType === t ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-300"}`}>
                {t === "mairie" ? tr("🏛️ Mairie (extrait)") : tr("🏥 Hôpital")}
              </button>
            ))}
          </div>
          <input className={champ} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder={pieceType === "hopital" ? tr("Numéro donné par l'hôpital") : tr("Numéro de l'extrait (ex : 125)")} />
          <input className={champ} value={commune} onChange={(e) => setCommune(e.target.value)} placeholder={pieceType === "hopital" ? tr("Nom de l'hôpital (ex : Hôpital Donka)") : tr("Commune de l'extrait (ex : Dabola)")} />
          <input className={champ} inputMode="numeric" maxLength={4} value={annee} onChange={(e) => setAnnee(e.target.value.replace(/\D/g, ""))} placeholder={tr("Année (ex : 2015)")} />
          {message && <p className={`text-sm rounded-lg px-3 py-2 ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{message.texte}</p>}
          <button type="button" disabled={occupe} onClick={() => envoyer()} className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-60">
            {occupe ? tr("Recherche…") : tr("Demander ma fiche")}
          </button>
        </div>
      )}
    </div>
  );
}

interface DemandeFiche {
  ficheId: string;
  fichePrenom: string;
  fichePhoto?: string | null;
  demandeur: { numeroH: string; prenom?: string; nomFamille?: string; photo?: string | null; dateNaissance?: string | null };
}

/** Parent : un enfant devenu grand demande à récupérer sa fiche — confirmer ou refuser. */
export function DemandesFichesEnfants({ onChange }: { onChange?: () => void }) {
  const { tr } = useTraduction();
  const [demandes, setDemandes] = useState<DemandeFiche[]>([]);
  const [occupe, setOccupe] = useState<string | null>(null);
  const charger = () => appel("/enfants-sans-compte/demandes").then((d) => setDemandes(d.demandes || [])).catch(() => {});
  useEffect(() => { void charger(); }, []);

  const repondre = async (d: DemandeFiche, decision: "accepter" | "refuser") => {
    const question = decision === "accepter"
      ? tr("{nom} est-il/elle bien votre enfant « {enfant} » ? Son compte sera relié à votre famille.", { nom: `${d.demandeur.prenom || ""} ${d.demandeur.nomFamille || ""}`.trim(), enfant: d.fichePrenom })
      : tr("Refuser ? Cette personne ne sera pas reliée à la fiche « {enfant} ».", { enfant: d.fichePrenom });
    if (!window.confirm(question)) return;
    setOccupe(d.ficheId);
    try { const r = await appel(`/enfants-sans-compte/${d.ficheId}/demande`, "POST", { decision }); alert(tr(r.message)); await charger(); onChange?.(); }
    catch (e) { alert((e as Error).message); }
    finally { setOccupe(null); }
  };

  if (!demandes.length) return null;
  return (
    <div className="mb-4 space-y-2">
      {demandes.map((d) => (
        <div key={d.ficheId} className="rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm text-amber-900">
            <strong>{`${d.demandeur.prenom || ""} ${d.demandeur.nomFamille || ""}`.trim() || d.demandeur.numeroH}</strong>
            {" "}{tr("dit être votre enfant « {enfant} » et demande à récupérer sa fiche.", { enfant: d.fichePrenom })}
            {d.demandeur.dateNaissance && <> {tr("Né(e) le")} {String(d.demandeur.dateNaissance).slice(0, 10)}.</>}
          </p>
          <div className="flex gap-2 mt-2">
            <button type="button" disabled={occupe === d.ficheId} onClick={() => repondre(d, "accepter")} className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60">
              {tr("✓ C'est mon enfant")}
            </button>
            <button type="button" disabled={occupe === d.ficheId} onClick={() => repondre(d, "refuser")} className="flex-1 py-2 rounded-lg bg-white border border-red-300 text-red-700 text-sm font-semibold disabled:opacity-60">
              {tr("Ce n'est pas lui/elle")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
