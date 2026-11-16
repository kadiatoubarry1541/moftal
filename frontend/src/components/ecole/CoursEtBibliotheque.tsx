import { useCallback, useEffect, useState } from "react";
import { config } from "../../config/api";
import { getPhotoUrl } from "../../utils/auth";
import { useTraduction } from "../../i18n/traduction";
import { heure, duree, tailleTexte } from "./formatEcole";

// École — écrans du directeur : pointage des cours (début / fin marqués par les
// enseignants) et bibliothèque de livres PDF réservée aux membres de l'école.

const jeton = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const api = (apiName: string, code: string, chemin: string) => `${config.API_BASE_URL}/${apiName}/${encodeURIComponent(code)}${chemin}`;


/** Retard au début, en minutes, par rapport à l'heure prévue (« 08:00 »). */
function retard(p: { debut: string; prevu_debut?: string | null }) {
  if (!p.prevu_debut) return 0;
  const [h, m] = p.prevu_debut.split(":").map(Number);
  const d = new Date(p.debut);
  const local = new Date(d.toLocaleString("en-US", { timeZone: "Africa/Conakry" }));
  return Math.round((local.getHours() * 60 + local.getMinutes()) - (h * 60 + m));
}

const aujourdhui = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Conakry" }).format(new Date());

interface Pointage {
  id: number; prenom?: string; nom?: string; classe?: string; matiere?: string | null;
  prevu_debut?: string | null; prevu_fin?: string | null; debut: string; fin?: string | null;
}

export function PointageCours({ tenantCode, apiName = "school-mgmt", couleur }: { tenantCode: string; apiName?: string; couleur: string }) {
  const { tr } = useTraduction();
  const [jour, setJour] = useState(aujourdhui);
  const [liste, setListe] = useState<Pointage[]>([]);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(() => {
    setChargement(true);
    fetch(api(apiName, tenantCode, `/pointages?jour=${jour}`), { headers: jeton() })
      .then((r) => r.json())
      .then((d) => { if (d.success) { setListe(d.pointages); setErreur(""); } else setErreur(d.message || "Erreur"); })
      .catch(() => setErreur("Erreur de connexion."))
      .finally(() => setChargement(false));
  }, [apiName, tenantCode, jour]);

  useEffect(() => { charger(); }, [charger]);
  // Les cours en cours avancent : on rafraîchit chaque minute
  useEffect(() => { const t = setInterval(charger, 60000); return () => clearInterval(t); }, [charger]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600">{tr("Heure de début et de fin marquées par chaque enseignant (heure du serveur).")}</p>
        </div>
        <input type="date" value={jour} max={aujourdhui()} onChange={(e) => setJour(e.target.value || aujourdhui())}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
      </div>

      {erreur && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{tr(erreur)}</p>}
      {!erreur && !chargement && liste.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-sm text-slate-500">
          {tr("Aucun cours marqué ce jour-là.")}
        </div>
      )}

      <div className="space-y-2">
        {liste.map((p) => {
          const r = retard(p);
          return (
            <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="min-w-[140px] flex-1">
                <p className="font-semibold text-slate-900 text-sm">{p.prenom} {p.nom}</p>
                <p className="text-xs text-slate-500">{p.classe || "—"}{p.matiere ? ` · ${tr(p.matiere)}` : ""}</p>
              </div>
              <div className="text-sm">
                <span className="font-bold" style={{ color: couleur }}>{heure(p.debut)}</span>
                <span className="text-slate-400"> → </span>
                {p.fin ? <span className="font-bold text-slate-800">{heure(p.fin)}</span>
                       : <span className="font-semibold text-amber-600">{tr("en cours")}</span>}
                <span className="text-xs text-slate-500"> · {duree(p.debut, p.fin)}</span>
              </div>
              <div className="text-xs">
                {p.prevu_debut && <span className="text-slate-400">{tr("Prévu {debut}–{fin}", { debut: p.prevu_debut, fin: p.prevu_fin || "?" })} </span>}
                {p.prevu_debut && (r > 5
                  ? <span className="ms-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold">{tr("{n} min de retard", { n: r })}</span>
                  : <span className="ms-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">{tr("À l'heure")}</span>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface Livre {
  id: number; titre: string; auteur?: string | null; niveau?: string | null;
  categorie?: string | null; matiere?: string | null; langue?: string | null; description?: string | null;
  fichier_url: string; taille?: number | null; created_at: string; retirable?: boolean;
}

const TYPES_DOCUMENT = ["Manuel scolaire", "Cours", "Exercices", "Sujet d'examen", "Livre de lecture", "Document de l'école", "Autre"];
const MATIERES_ECOLE = ["Français", "Mathématiques", "Sciences", "Histoire-Géographie", "Éducation civique", "Anglais", "Arabe", "Physique-Chimie", "SVT", "Philosophie", "Informatique"];
const MATIERES_MADRASA = ["Coran", "Tajwid", "Langue arabe", "Fiqh", "Hadith", "Sîra", "Tawhid", "Éducation islamique"];
const LANGUES = ["Français", "Arabe", "Anglais", "Peul", "Soussou", "Malinké"];
const SANS_NIVEAU = "Tous niveaux";

export function CarteLivre({ livre, couleur, onSupprimer }: { livre: Livre; couleur: string; onSupprimer?: () => void }) {
  const { tr } = useTraduction();
  const details = [livre.auteur, livre.matiere ? tr(livre.matiere) : null, livre.langue && livre.langue !== livre.matiere ? tr(livre.langue) : null, tailleTexte(livre.taille)].filter(Boolean);
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 flex items-start gap-3">
      <div className="w-11 h-14 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: couleur }}>PDF</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">{livre.titre}</p>
        {livre.categorie && (
          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800">{tr(livre.categorie)}</span>
        )}
        {details.length > 0 && <p className="text-xs text-slate-500 mt-0.5">{details.join(" · ")}</p>}
        {livre.description && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{livre.description}</p>}
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <a href={getPhotoUrl(livre.fichier_url) || "#"} target="_blank" rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white text-center" style={{ background: couleur }}>
          {tr("Lire")}
        </a>
        {onSupprimer && (
          <button onClick={onSupprimer} className="px-2 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50">{tr("Retirer")}</button>
        )}
      </div>
    </div>
  );
}

const VIDE = { titre: "", auteur: "", categorie: TYPES_DOCUMENT[0], niveau: "", matiere: "", langue: "Français", description: "" };

/** Formulaire de publication d'un livre ou document PDF (direction et enseignants). */
function FormulaireLivre({ url, niveaux, madrasa, couleur, onPublie }: { url: string; niveaux: string[]; madrasa: boolean; couleur: string; onPublie: () => void }) {
  const { tr } = useTraduction();
  const [f, setF] = useState(VIDE);
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const maj = (k: keyof typeof VIDE) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const publier = async () => {
    if (!f.titre.trim() || !fichier) { setErreur(tr("Donnez le titre et choisissez le fichier PDF.")); return; }
    setEnvoi(true); setErreur("");
    try {
      const fd = new FormData();
      (Object.keys(f) as (keyof typeof VIDE)[]).forEach((k) => fd.append(k, f[k].trim()));
      fd.append("fichier", fichier);
      const r = await fetch(url, { method: "POST", headers: jeton(), body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.message || "Le livre n'a pas pu être enregistré.");
      setF(VIDE); setFichier(null);
      onPublie();
    } catch (e) {
      setErreur(tr((e as Error).message));
    } finally { setEnvoi(false); }
  };

  const champ = "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500";
  const etiquette = "block text-sm font-medium text-gray-700 mb-1";
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 sm:p-5 space-y-3">
      <h3 className="font-semibold text-yellow-900 text-base">{tr("Publier un livre ou un document")}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={etiquette}>{tr("Titre")} *</label>
          <input className={champ} value={f.titre} onChange={maj("titre")} placeholder={tr(madrasa ? "Ex : Apprendre le Tajwid" : "Ex : Mathématiques 3e année")} />
        </div>
        <div>
          <label className={etiquette}>{tr("Auteur")}</label>
          <input className={champ} value={f.auteur} onChange={maj("auteur")} placeholder={tr("Ex : nom de l'auteur ou de l'éditeur")} />
        </div>
        <div>
          <label className={etiquette}>{tr("Type de document")}</label>
          <select className={champ} value={f.categorie} onChange={maj("categorie")}>
            {TYPES_DOCUMENT.map((t) => <option key={t} value={t}>{tr(t)}</option>)}
          </select>
        </div>
        <div>
          <label className={etiquette}>{tr("Niveau / classe")}</label>
          {niveaux.length > 0 ? (
            <select className={champ} value={f.niveau} onChange={maj("niveau")}>
              <option value="">{tr(SANS_NIVEAU)}</option>
              {niveaux.map((n) => <option key={n} value={n}>{tr(n)}</option>)}
            </select>
          ) : (
            <input className={champ} value={f.niveau} onChange={maj("niveau")} placeholder={tr("Ex : 2e année, 3e année…")} />
          )}
        </div>
        <div>
          <label className={etiquette}>{tr("Matière")}</label>
          <input className={champ} list="biblio-matieres" value={f.matiere} onChange={maj("matiere")} placeholder={tr(madrasa ? "Ex : Coran" : "Ex : Français")} />
          <datalist id="biblio-matieres">
            {(madrasa ? MATIERES_MADRASA : MATIERES_ECOLE).map((m) => <option key={m} value={tr(m)} />)}
          </datalist>
        </div>
        <div>
          <label className={etiquette}>{tr("Langue")}</label>
          <select className={champ} value={f.langue} onChange={maj("langue")}>
            {LANGUES.map((l) => <option key={l} value={l}>{tr(l)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={etiquette}>{tr("Description")}</label>
        <textarea className={champ} rows={2} value={f.description} onChange={maj("description")} placeholder={tr("Décrivez ce livre ou ce document…")} />
      </div>
      <div>
        <label className={etiquette}>{tr("Fichier PDF")} * <span className="font-normal text-gray-500">({tr("25 Mo max.")})</span></label>
        <input type="file" accept=".pdf,application/pdf" onChange={(e) => setFichier(e.target.files?.[0] || null)}
          className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-yellow-100 file:text-yellow-800 hover:file:bg-yellow-200" />
        {fichier && <p className="text-xs text-green-700 mt-1">📄 {fichier.name}</p>}
      </div>
      {erreur && <p className="text-sm rounded-lg px-3 py-2 bg-red-50 text-red-700">{erreur}</p>}
      <button onClick={publier} disabled={envoi || !f.titre.trim() || !fichier}
        className="px-6 py-2.5 rounded-lg text-white text-sm font-bold disabled:opacity-50" style={{ background: couleur }}>
        {envoi ? tr("Publication…") : `✓ ${tr("Publier")}`}
      </button>
    </div>
  );
}

/**
 * Bibliothèque de l'établissement, classée par niveau. La direction et les
 * enseignants publient ; chacun lit. Utilisée dans la gestion et dans
 * l'application des membres.
 */
export function Bibliotheque({ tenantCode, apiName = "school-mgmt", couleur, onEcole }: {
  tenantCode: string; apiName?: string; couleur: string;
  onEcole?: (ecole: { nom: string; logo_url?: string | null }) => void;
}) {
  const { tr } = useTraduction();
  const madrasa = apiName === "madrasa-mgmt";
  const url = api(apiName, tenantCode, "/bibliotheque");
  const [livres, setLivres] = useState<Livre[]>([]);
  const [niveaux, setNiveaux] = useState<string[]>([]);
  const [peutPublier, setPeutPublier] = useState(false);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState("");
  const [formulaire, setFormulaire] = useState(false);
  const [succes, setSucces] = useState("");
  const [filtre, setFiltre] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");

  const charger = useCallback(() => {
    fetch(url, { headers: jeton() })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .then(({ ok, d }) => {
        if (ok && d.success) {
          setLivres(d.livres || []); setNiveaux(d.niveaux || []); setPeutPublier(!!d.peut_publier); setErreur("");
          if (d.ecole) onEcole?.(d.ecole);
        } else setErreur(d.message || "Accès refusé.");
      })
      .catch(() => setErreur("Erreur de connexion. Réessayez."))
      .finally(() => setCharge(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onEcole change à chaque rendu du parent
  }, [url]);
  useEffect(() => { charger(); }, [charger]);

  const supprimer = async (l: Livre) => {
    if (!window.confirm(tr("Retirer « {titre} » de la bibliothèque ?", { titre: l.titre }))) return;
    try {
      const r = await fetch(api(apiName, tenantCode, `/bibliotheque/${l.id}`), { method: "DELETE", headers: jeton() });
      const d = await r.json().catch(() => ({}));
      if (d.success) charger(); else alert(tr(d.message || "Erreur"));
    } catch { alert(tr("Erreur de connexion. Réessayez.")); }
  };

  // Niveaux présents dans la bibliothèque, dans l'ordre des classes de l'école
  const niveauDe = (l: Livre) => String(l.niveau || "").trim() || SANS_NIVEAU;
  const presents = [...new Set(livres.map(niveauDe))].sort((a, b) => {
    const ia = a === SANS_NIVEAU ? 1e6 : (niveaux.indexOf(a) + 1 || 1e5);
    const ib = b === SANS_NIVEAU ? 1e6 : (niveaux.indexOf(b) + 1 || 1e5);
    return ia - ib || a.localeCompare(b);
  });
  const q = recherche.trim().toLowerCase();
  const visibles = livres.filter((l) =>
    (!filtre || niveauDe(l) === filtre) &&
    (!q || [l.titre, l.auteur, l.niveau, l.matiere, l.categorie, l.description].some((x) => String(x || "").toLowerCase().includes(q))));
  const groupes = presents.map((n) => ({ niveau: n, livres: visibles.filter((l) => niveauDe(l) === n) })).filter((g) => g.livres.length > 0);

  if (erreur) return <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{tr(erreur)}</p>;

  const puce = (actif: boolean) => `px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${actif ? "text-white border-transparent" : "bg-white text-slate-700 border-slate-200"}`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 flex-1 min-w-[200px]">{tr("Les livres et documents PDF de l'établissement, classés par niveau. Seuls ses membres (enseignants, apprenants, parents) peuvent les lire.")}</p>
        {peutPublier && (
          <button onClick={() => { setFormulaire(!formulaire); setSucces(""); }}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white" style={{ background: formulaire ? "#ca8a04" : couleur }}>
            {formulaire ? `✕ ${tr("Annuler")}` : `➕ ${tr("Publier un livre / document")}`}
          </button>
        )}
      </div>

      {peutPublier && formulaire && (
        <FormulaireLivre url={url} niveaux={niveaux} madrasa={madrasa} couleur={couleur}
          onPublie={() => { setFormulaire(false); setSucces(tr("Livre ajouté à la bibliothèque.")); charger(); }} />
      )}
      {succes && <p className="text-sm rounded-lg px-3 py-2 bg-emerald-50 text-emerald-800">{succes}</p>}

      {livres.length > 4 && (
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={tr("Rechercher un livre…")}
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white" />
      )}
      {presents.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button className={puce(!filtre)} style={!filtre ? { background: couleur } : undefined} onClick={() => setFiltre(null)}>{tr("Tous")}</button>
          {presents.map((n) => (
            <button key={n} className={puce(filtre === n)} style={filtre === n ? { background: couleur } : undefined} onClick={() => setFiltre(n)}>{tr(n)}</button>
          ))}
        </div>
      )}

      {charge && groupes.length === 0 && <p className="text-sm text-slate-500 text-center py-6">{tr("Aucun livre pour le moment.")}</p>}
      {groupes.map((g) => (
        <section key={g.niveau} className="space-y-2">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full" style={{ background: couleur }} />
            {tr(g.niveau)} <span className="font-normal text-slate-400">({g.livres.length})</span>
          </h3>
          {g.livres.map((l) => <CarteLivre key={l.id} livre={l} couleur={couleur} onSupprimer={l.retirable ? () => supprimer(l) : undefined} />)}
        </section>
      ))}
    </div>
  );
}

/** Bibliothèque dans la gestion (direction). */
export function BibliothequeGestion({ tenantCode, apiName = "school-mgmt", couleur }: { tenantCode: string; apiName?: string; couleur: string }) {
  return <Bibliotheque tenantCode={tenantCode} apiName={apiName} couleur={couleur} />;
}
