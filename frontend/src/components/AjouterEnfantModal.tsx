import { useEffect, useMemo, useRef, useState } from "react";
import { compressImage } from "../utils/compressImage";
import { getAllLocationsForGroups } from "../utils/worldGeography";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5002";

// Ajouter (ou corriger) un enfant qui n'a pas de compte Moftal : bébé, mineur,
// enfant décédé jeune. Comme les grands sites d'arbres généalogiques : très peu
// d'obligatoire (prénom, sexe, vivant/décédé, l'autre parent) ; le reste peut
// être ajouté plus tard. L'extrait de naissance (numéro + commune + année) est
// facultatif : il permet à l'enfant devenu grand de retrouver sa fiche.

export interface FicheEnfant {
  ficheId: string;
  prenom: string;
  nomFamille?: string;
  genre?: string;
  estVivant?: boolean;
  dateNaissance?: string | null;
  dateDeces?: string | null;
  photo?: string | null;
  quartierNaissance?: string | null;
  extraitNumero?: string | null;
  extraitCommune?: string | null;
  extraitAnnee?: string | null;
  autreParentNom?: string | null;
}

interface Conjoint { numeroH: string; prenom?: string; nomFamille?: string }

interface Props {
  user: { numeroH: string; prenom?: string; nomFamille?: string; genre?: string } | null;
  fiche?: FicheEnfant | null; // présent = modification
  onClose: () => void;
  onSaved: (message: string) => void;
}

function lireFichier(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const champ = "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

export default function AjouterEnfantModal({ user, fiche, onClose, onSaved }: Props) {
  const modif = !!fiche;
  const estFemme = String(user?.genre || "").toUpperCase() === "FEMME";
  const [prenom, setPrenom] = useState(fiche?.prenom || "");
  const [nomFamille, setNomFamille] = useState(fiche?.nomFamille ?? user?.nomFamille ?? "");
  const [genre, setGenre] = useState<"HOMME" | "FEMME" | "">((fiche?.genre as "HOMME" | "FEMME") || "");
  const [estVivant, setEstVivant] = useState<boolean | null>(fiche ? fiche.estVivant !== false : null);
  const [dateNaissance, setDateNaissance] = useState(fiche?.dateNaissance?.slice(0, 10) || "");
  const [dateDeces, setDateDeces] = useState(fiche?.dateDeces?.slice(0, 10) || "");
  const [photo, setPhoto] = useState<string | null>(null);
  const [apercu, setApercu] = useState<string | null>(fiche?.photo || null);
  const [quartier, setQuartier] = useState(fiche?.quartierNaissance || "");
  const [extraitNumero, setExtraitNumero] = useState(fiche?.extraitNumero || "");
  const [extraitCommune, setExtraitCommune] = useState(fiche?.extraitCommune || "");
  const [extraitAnnee, setExtraitAnnee] = useState(fiche?.extraitAnnee || "");
  const [voirExtrait, setVoirExtrait] = useState(!!fiche?.extraitNumero);
  const [conjoints, setConjoints] = useState<Conjoint[]>([]);
  // Autre parent : NuméroH du conjoint lié, "nom" (hors Moftal) ou "inconnu"
  const [autreChoix, setAutreChoix] = useState<string>(fiche ? (fiche.autreParentNom ? "nom" : "") : "");
  const [autreNom, setAutreNom] = useState(fiche?.autreParentNom || "");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const inputPhoto = useRef<HTMLInputElement>(null);
  const communes = useMemo(() => {
    const noms = new Set<string>();
    for (const g of ["sous_prefecture", "prefecture"] as const) {
      try { getAllLocationsForGroups(g).forEach((l: { name: string }) => noms.add(l.name)); } catch { /* */ }
    }
    return [...noms].sort((a, b) => a.localeCompare(b, "fr"));
  }, []);

  // Conjoint(s) lié(s) : épouses pour un homme, mari pour une femme
  useEffect(() => {
    const token = localStorage.getItem("token");
    const url = estFemme ? "/api/couple/my-partner" : "/api/couple/my-wives";
    fetch(`${API_BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const liste: Conjoint[] = estFemme
          ? (d?.partner ? [d.partner] : [])
          : (d?.wives || []).map((w: { wife: Conjoint | null }) => w.wife).filter(Boolean);
        setConjoints(liste);
        if (!fiche && liste.length === 1) setAutreChoix(liste[0].numeroH);
      })
      .catch(() => {});
  }, [estFemme, fiche]);

  const choisirPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const petite = await compressImage(f, 800, 0.8);
      const data = await lireFichier(petite);
      setPhoto(data);
      setApercu(data);
    } catch {
      setErreur("Impossible de lire cette photo. Essayez une autre image.");
    }
  };

  const libelleAutre = estFemme ? "Le père de l'enfant" : "La mère de l'enfant";

  const enregistrer = async (confirmerMemeEnfant = false) => {
    setErreur("");
    if (!prenom.trim()) return setErreur("Écrivez le prénom de l'enfant.");
    if (!genre) return setErreur("Choisissez garçon ou fille.");
    if (estVivant === null) return setErreur("Indiquez si l'enfant est vivant ou décédé.");
    if (!modif && !autreChoix) return setErreur(`Indiquez ${estFemme ? "le père" : "la mère"} de l'enfant.`);
    if (autreChoix === "nom" && !autreNom.trim()) return setErreur(`Écrivez le nom ${estFemme ? "du père" : "de la mère"}.`);
    const papiers = [extraitNumero, extraitCommune, extraitAnnee].filter((v) => v.trim()).length;
    if (papiers > 0 && papiers < 3) return setErreur("Pour l'extrait de naissance, remplissez les trois : numéro, commune et année.");
    if (papiers === 3 && !/^\d{4}$/.test(extraitAnnee.trim())) return setErreur("L'année de l'extrait doit avoir 4 chiffres (ex : 2015).");
    if (papiers === 3 && !dateNaissance) return setErreur("Avec l'extrait de naissance, la date de naissance est obligatoire.");

    const corps: Record<string, unknown> = {
      prenom: prenom.trim(),
      nomFamille: nomFamille.trim(),
      genre,
      estVivant,
      dateNaissance: dateNaissance || null,
      dateDeces: estVivant ? null : (dateDeces || null),
      quartierNaissance: quartier.trim() || null,
      ...(photo ? { photo } : {}),
      ...(papiers === 3 ? { extraitNumero: extraitNumero.trim(), extraitCommune: extraitCommune.trim(), extraitAnnee: extraitAnnee.trim() } : {}),
      ...(modif && papiers === 0 && fiche?.extraitNumero ? { retirerExtrait: true } : {}),
    };
    if (autreChoix === "nom") corps.autreParentNom = autreNom.trim();
    else if (autreChoix === "inconnu") corps.autreParentInconnu = true;
    else if (autreChoix) corps.autreParentNumeroH = autreChoix;
    if (confirmerMemeEnfant) corps.confirmerMemeEnfant = true;

    setEnvoi(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/parent-child/enfants-sans-compte${modif ? `/${fiche!.ficheId}` : ""}`, {
        method: modif ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.code === "CONFIRMER_MEME_ENFANT") {
        if (window.confirm(data.message)) return enregistrer(true);
        return setErreur("Vérifiez le numéro, la commune et l'année de l'extrait de naissance.");
      }
      if (!res.ok || !data.success) return setErreur(data.message || "L'enregistrement a échoué. Réessayez.");
      onSaved(data.message || "Enregistré.");
    } catch {
      setErreur("Erreur de connexion. Vérifiez votre connexion internet et réessayez.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-800">{modif ? "✏️ Modifier la fiche de l'enfant" : "👶 Ajouter un enfant"}</h3>
          <button type="button" onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-lg hover:bg-slate-100 text-lg">✕</button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Pour un enfant sans compte Moftal (bébé, enfant mineur, enfant décédé). Seuls les champs avec * sont obligatoires.
        </p>

        {erreur && <p className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erreur}</p>}

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => inputPhoto.current?.click()}
              className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-dashed border-emerald-300 overflow-hidden flex items-center justify-center flex-shrink-0">
              {apercu ? <img src={apercu} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl">📷</span>}
            </button>
            <div className="text-xs text-slate-500">
              <button type="button" onClick={() => inputPhoto.current?.click()} className="font-semibold text-emerald-700">
                {apercu ? "Changer la photo" : "Ajouter une photo"}
              </button>
              <div>(facultatif)</div>
            </div>
            <input ref={inputPhoto} type="file" accept="image/*" className="hidden" onChange={choisirPhoto} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom *</label>
              <input className={champ} value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ex : Fatou" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom de famille</label>
              <input className={champ} value={nomFamille} onChange={(e) => setNomFamille(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sexe *</label>
            <div className="grid grid-cols-2 gap-2">
              {([["HOMME", "👦 Garçon"], ["FEMME", "👧 Fille"]] as const).map(([v, l]) => (
                <button key={v} type="button" onClick={() => setGenre(v)}
                  className={`py-2.5 rounded-lg border-2 text-sm font-semibold ${genre === v ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}>{l}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">L'enfant est *</label>
            <div className="grid grid-cols-2 gap-2">
              {([[true, "🌱 Vivant"], [false, "🕊️ Décédé"]] as const).map(([v, l]) => (
                <button key={String(v)} type="button" onClick={() => setEstVivant(v)}
                  className={`py-2.5 rounded-lg border-2 text-sm font-semibold ${estVivant === v ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}>{l}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date de naissance</label>
              <input type="date" className={champ} value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} />
            </div>
            {estVivant === false && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date de décès</label>
                <input type="date" className={champ} value={dateDeces} onChange={(e) => setDateDeces(e.target.value)} />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{libelleAutre} {modif ? "" : "*"}</label>
            <select className={champ} value={autreChoix} onChange={(e) => setAutreChoix(e.target.value)}>
              <option value="">{modif ? "— Ne pas changer —" : "— Choisir —"}</option>
              {conjoints.map((c) => (
                <option key={c.numeroH} value={c.numeroH}>{`${c.prenom || ""} ${c.nomFamille || ""}`.trim()} (sur Moftal)</option>
              ))}
              <option value="nom">{estFemme ? "Il" : "Elle"} n'est pas sur Moftal : j'écris son nom</option>
              {!modif && <option value="inconnu">Je préfère ne pas l'indiquer</option>}
            </select>
            {autreChoix === "nom" && (
              <input className={`${champ} mt-2`} value={autreNom} onChange={(e) => setAutreNom(e.target.value)} placeholder="Prénom et nom" />
            )}
            {autreChoix && autreChoix !== "nom" && autreChoix !== "inconnu" && (
              <p className="text-xs text-emerald-700 mt-1">✓ L'enfant apparaîtra aussi automatiquement chez {estFemme ? "lui" : "elle"}.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Quartier de naissance</label>
            <input className={champ} value={quartier} onChange={(e) => setQuartier(e.target.value)} placeholder="Facultatif" />
          </div>

          <div className="border border-slate-200 rounded-xl">
            <button type="button" onClick={() => setVoirExtrait((v) => !v)} className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-slate-700">
              <span>📄 Extrait de naissance <span className="font-normal text-slate-400">(facultatif)</span></span>
              <span className="text-slate-400">{voirExtrait ? "▲" : "▼"}</span>
            </button>
            {voirExtrait && (
              <div className="px-3 pb-3 space-y-2">
                <p className="text-xs text-slate-500">
                  Permet à votre enfant, devenu grand, de retrouver cette fiche avec son propre compte.
                  Le numéro n'est unique que dans une commune et une année : remplissez les trois.
                  Seuls les parents voient ces informations.
                </p>
                <input className={champ} value={extraitNumero} onChange={(e) => setExtraitNumero(e.target.value)} placeholder="Numéro de l'extrait (ex : 125)" />
                <input className={champ} list="communes-extrait" value={extraitCommune} onChange={(e) => setExtraitCommune(e.target.value)} placeholder="Commune de l'extrait (ex : Dabola)" />
                <datalist id="communes-extrait">{communes.map((c) => <option key={c} value={c} />)}</datalist>
                <input className={champ} inputMode="numeric" maxLength={4} value={extraitAnnee} onChange={(e) => setExtraitAnnee(e.target.value.replace(/\D/g, ""))} placeholder="Année de l'extrait (ex : 2015)" />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold">Annuler</button>
          <button type="button" disabled={envoi} onClick={() => enregistrer()} className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-60">
            {envoi ? "Enregistrement…" : modif ? "✓ Enregistrer" : "✓ Ajouter l'enfant"}
          </button>
        </div>
      </div>
    </div>
  );
}
