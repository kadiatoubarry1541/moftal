import { useCallback, useEffect, useState } from "react";
import { config } from "../../config/api";
import { getPhotoUrl } from "../../utils/auth";

// École — écrans du directeur : pointage des cours (début / fin marqués par les
// enseignants) et bibliothèque de livres PDF réservée aux membres de l'école.

const jeton = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const api = (apiName: string, code: string, chemin: string) => `${config.API_BASE_URL}/${apiName}/${encodeURIComponent(code)}${chemin}`;

export const heure = (d?: string | null) =>
  d ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Conakry" }) : "—";

export function duree(debut?: string | null, fin?: string | null) {
  if (!debut) return "—";
  const min = Math.max(0, Math.round(((fin ? new Date(fin) : new Date()).getTime() - new Date(debut).getTime()) / 60000));
  return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}` : `${min} min`;
}

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
          <p className="text-sm text-slate-600">Heure de début et de fin marquées par chaque enseignant (heure du serveur).</p>
        </div>
        <input type="date" value={jour} max={aujourdhui()} onChange={(e) => setJour(e.target.value || aujourdhui())}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
      </div>

      {erreur && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{erreur}</p>}
      {!erreur && !chargement && liste.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-sm text-slate-500">
          Aucun cours marqué ce jour-là.
        </div>
      )}

      <div className="space-y-2">
        {liste.map((p) => {
          const r = retard(p);
          return (
            <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="min-w-[140px] flex-1">
                <p className="font-semibold text-slate-900 text-sm">{p.prenom} {p.nom}</p>
                <p className="text-xs text-slate-500">{p.classe || "—"}{p.matiere ? ` · ${p.matiere}` : ""}</p>
              </div>
              <div className="text-sm">
                <span className="font-bold" style={{ color: couleur }}>{heure(p.debut)}</span>
                <span className="text-slate-400"> → </span>
                {p.fin ? <span className="font-bold text-slate-800">{heure(p.fin)}</span>
                       : <span className="font-semibold text-amber-600">en cours</span>}
                <span className="text-xs text-slate-500"> · {duree(p.debut, p.fin)}</span>
              </div>
              <div className="text-xs">
                {p.prevu_debut && <span className="text-slate-400">Prévu {p.prevu_debut}–{p.prevu_fin || "?"} </span>}
                {p.prevu_debut && (r > 5
                  ? <span className="ml-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold">{r} min de retard</span>
                  : <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">À l'heure</span>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface Livre { id: number; titre: string; auteur?: string | null; niveau?: string | null; fichier_url: string; taille?: number | null; created_at: string }

export const tailleTexte = (n?: number | null) => !n ? "" : n >= 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`;

export function CarteLivre({ livre, couleur, onSupprimer }: { livre: Livre; couleur: string; onSupprimer?: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-3">
      <div className="w-11 h-14 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: couleur }}>PDF</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm truncate">{livre.titre}</p>
        <p className="text-xs text-slate-500 truncate">
          {[livre.auteur, livre.niveau, tailleTexte(livre.taille)].filter(Boolean).join(" · ")}
        </p>
      </div>
      <a href={getPhotoUrl(livre.fichier_url) || "#"} target="_blank" rel="noopener noreferrer"
        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex-shrink-0" style={{ background: couleur }}>
        Lire
      </a>
      {onSupprimer && (
        <button onClick={onSupprimer} className="px-2 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 flex-shrink-0">Retirer</button>
      )}
    </div>
  );
}

export function BibliothequeGestion({ tenantCode, apiName = "school-mgmt", couleur }: { tenantCode: string; apiName?: string; couleur: string }) {
  const [livres, setLivres] = useState<Livre[]>([]);
  const [titre, setTitre] = useState("");
  const [auteur, setAuteur] = useState("");
  const [niveau, setNiveau] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const charger = useCallback(() => {
    fetch(api(apiName, tenantCode, "/bibliotheque"), { headers: jeton() })
      .then((r) => r.json()).then((d) => d.success && setLivres(d.livres)).catch(() => {});
  }, [apiName, tenantCode]);
  useEffect(() => { charger(); }, [charger]);

  const ajouter = async () => {
    if (!titre.trim() || !fichier) { setMessage({ ok: false, texte: "Donnez le titre et choisissez le fichier PDF." }); return; }
    setEnvoi(true); setMessage(null);
    try {
      const fd = new FormData();
      fd.append("titre", titre.trim()); fd.append("auteur", auteur.trim()); fd.append("niveau", niveau.trim()); fd.append("fichier", fichier);
      const r = await fetch(api(apiName, tenantCode, "/bibliotheque"), { method: "POST", headers: jeton(), body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.message || "Le livre n'a pas pu être enregistré.");
      setTitre(""); setAuteur(""); setNiveau(""); setFichier(null);
      setMessage({ ok: true, texte: d.queued ? d.message : "Livre ajouté à la bibliothèque." });
      charger();
    } catch (e) {
      setMessage({ ok: false, texte: (e as Error).message });
    } finally { setEnvoi(false); }
  };

  const supprimer = async (l: Livre) => {
    if (!window.confirm(`Retirer « ${l.titre} » de la bibliothèque ?`)) return;
    try {
      const r = await fetch(api(apiName, tenantCode, `/bibliotheque/${l.id}`), { method: "DELETE", headers: jeton() });
      const d = await r.json().catch(() => ({}));
      if (d.success) charger(); else alert(d.message || "Erreur");
    } catch { alert("Erreur de connexion. Réessayez."); }
  };

  const champ = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm";
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-600">Les livres PDF de l'établissement. Seuls ses membres (enseignants, élèves, parents) peuvent les lire.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-2">
        <input className={champ} value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre du livre *" />
        <div className="grid grid-cols-2 gap-2">
          <input className={champ} value={auteur} onChange={(e) => setAuteur(e.target.value)} placeholder="Auteur" />
          <input className={champ} value={niveau} onChange={(e) => setNiveau(e.target.value)} placeholder="Classe / niveau" />
        </div>
        <label className="flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-lg px-3 py-3 cursor-pointer text-sm text-slate-600">
          <span className="text-xl">📄</span>
          <span className="flex-1 truncate">{fichier ? fichier.name : "Choisir le fichier PDF (25 Mo max.)"}</span>
          <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => setFichier(e.target.files?.[0] || null)} />
        </label>
        {message && <p className={`text-sm rounded-lg px-3 py-2 ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{message.texte}</p>}
        <button onClick={ajouter} disabled={envoi} className="w-full py-2.5 rounded-lg text-white text-sm font-bold disabled:opacity-60" style={{ background: couleur }}>
          {envoi ? "Envoi…" : "Ajouter le livre"}
        </button>
      </div>

      <div className="space-y-2">
        {livres.length === 0 && <p className="text-sm text-slate-500 text-center py-6">Aucun livre pour le moment.</p>}
        {livres.map((l) => <CarteLivre key={l.id} livre={l} couleur={couleur} onSupprimer={() => supprimer(l)} />)}
      </div>
    </div>
  );
}
