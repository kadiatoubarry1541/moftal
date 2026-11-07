import { useCallback, useEffect, useState } from "react";
import { useTraduction } from "../../i18n/traduction";

// Espace enseignant (école) : appel et notes des élèves de SA classe, quand le
// directeur lui en a donné le droit. Le serveur vérifie tout (droit, classe,
// élève) : ces volets ne font qu'envoyer ce que l'enseignant a choisi.

const jeton = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

type Statut = "present" | "absent" | "retard";
interface Eleve { id: number; prenom: string; nom: string }
interface NoteSaisie { id: number; student_id: number; matiere: string; note: number | string; note_max: number | string; periode?: string | null; annee_scolaire?: string | null }

/** Même liste que la gestion de l'école, pour que les notes entrent dans les mêmes bulletins */
const PERIODES = ["Trim 1", "Trim 2", "Trim 3", "Sem 1", "Sem 2", "Annuel"];

const aujourdhui = () => new Intl.DateTimeFormat("en-CA").format(new Date());

async function lire<T>(url: string, init?: RequestInit): Promise<T & { success?: boolean; message?: string }> {
  try {
    const r = await fetch(url, { ...init, headers: jeton() });
    return await r.json().catch(() => ({ success: false, message: "Le serveur ne répond pas. Réessayez dans un instant." }));
  } catch {
    return { success: false, message: "Connexion coupée : rien n'a été enregistré. Réessayez." } as T & { success: boolean; message: string };
  }
}

export function AppelClasse({ base, classroomId, couleur }: { base: string; classroomId: number; couleur: string }) {
  const { tr } = useTraduction();
  const [date, setDate] = useState(aujourdhui());
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [statuts, setStatuts] = useState<Record<string, Statut>>({});
  const [etat, setEtat] = useState<"chargement" | "pret" | "envoi" | "erreur">("chargement");
  const [message, setMessage] = useState("");

  const charger = useCallback(async () => {
    setEtat("chargement"); setMessage("");
    const d = await lire<{ eleves?: Eleve[]; presences?: { student_id: number; statut: Statut | null }[] }>(
      `${base}/enseignant/appel?classroom_id=${classroomId}&date=${date}`);
    if (!d.success) { setEtat("erreur"); setMessage(d.message || "Erreur."); return; }
    const liste = d.eleves || [];
    const deja = new Map((d.presences || []).map((p) => [String(p.student_id), p.statut || "present"]));
    setEleves(liste);
    // Appel déjà fait ce jour-là : on le reprend ; sinon tout le monde présent
    setStatuts(Object.fromEntries(liste.map((e) => [String(e.id), (deja.get(String(e.id)) as Statut) || "present"])));
    setEtat("pret");
  }, [base, classroomId, date]);

  useEffect(() => { void charger(); }, [charger]);

  const enregistrer = async () => {
    setEtat("envoi"); setMessage("");
    const d = await lire<{ enregistres?: number }>(`${base}/enseignant/appel`, {
      method: "POST",
      body: JSON.stringify({ classroom_id: classroomId, date, records: eleves.map((e) => ({ student_id: e.id, statut: statuts[String(e.id)] || "present" })) }),
    });
    setEtat("pret");
    setMessage(d.success ? tr("✅ Appel enregistré ({n} élèves)", { n: d.enregistres ?? eleves.length }) : tr(d.message || "Erreur."));
  };

  const BOUTONS: [Statut, string, string][] = [["present", "P", "#16a34a"], ["retard", "R", "#d97706"], ["absent", "A", "#dc2626"]];
  const absents = eleves.filter((e) => statuts[String(e.id)] === "absent").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 p-3">
        <label className="text-xs font-bold text-slate-600">{tr("Date")}</label>
        <input type="date" value={date} max={aujourdhui()} onChange={(e) => setDate(e.target.value || aujourdhui())}
          className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5" />
      </div>
      {etat === "chargement" && <p className="text-sm text-slate-500 p-2">{tr("Chargement…")}</p>}
      {etat === "erreur" && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{tr(message)}</p>}
      {(etat === "pret" || etat === "envoi") && (<>
        {eleves.length === 0 && <p className="text-sm text-slate-500 bg-white rounded-xl border p-4">{tr("Aucun élève dans cette classe pour le moment.")}</p>}
        {eleves.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">
            {eleves.map((e) => (
              <div key={e.id} className="flex items-center gap-2 px-3 py-2">
                <span className="flex-1 min-w-0 text-sm font-semibold text-slate-900 truncate">{e.prenom} {e.nom}</span>
                {BOUTONS.map(([s, lettre, c]) => {
                  const actif = statuts[String(e.id)] === s;
                  return (
                    <button key={s} type="button" aria-label={tr(s === "present" ? "Présent" : s === "absent" ? "Absent" : "En retard")}
                      onClick={() => setStatuts((p) => ({ ...p, [String(e.id)]: s }))}
                      className="w-9 h-9 rounded-full text-sm font-extrabold border-2"
                      style={actif ? { background: c, borderColor: c, color: "white" } : { borderColor: "#e2e8f0", color: "#94a3b8", background: "white" }}>
                      {lettre}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        {eleves.length > 0 && (
          <button type="button" onClick={() => void enregistrer()} disabled={etat === "envoi"}
            className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60" style={{ background: couleur }}>
            {etat === "envoi" ? tr("Enregistrement…") : tr("Enregistrer l'appel ({n} absent(s))", { n: absents })}
          </button>
        )}
        {message && <p className={`text-sm rounded-xl p-3 ${message.startsWith("✅") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{message}</p>}
        <p className="text-xs text-slate-400">{tr("P = présent · R = en retard · A = absent. Le directeur voit l'appel dans la gestion de l'école.")}</p>
      </>)}
    </div>
  );
}

export function NotesClasse({ base, classroomId, couleur, matieresClasse = [] }: { base: string; classroomId: number; couleur: string; matieresClasse?: string[] }) {
  const { tr } = useTraduction();
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [notes, setNotes] = useState<NoteSaisie[]>([]);
  const [annee, setAnnee] = useState("");
  const [form, setForm] = useState({ student_id: "", matiere: matieresClasse[0] || "", note: "", note_max: "20", periode: "Trim 1" });
  const [etat, setEtat] = useState<"chargement" | "pret" | "envoi" | "erreur">("chargement");
  const [message, setMessage] = useState("");

  const charger = useCallback(async () => {
    const d = await lire<{ eleves?: Eleve[]; notes?: NoteSaisie[]; annee?: string }>(`${base}/enseignant/notes?classroom_id=${classroomId}`);
    if (!d.success) { setEtat("erreur"); setMessage(d.message || "Erreur."); return; }
    setEleves(d.eleves || []); setNotes(d.notes || []); setAnnee(d.annee || "");
    setEtat("pret");
  }, [base, classroomId]);

  useEffect(() => { void charger(); }, [charger]);

  const nomEleve = (id: number | string) => { const e = eleves.find((x) => String(x.id) === String(id)); return e ? `${e.prenom} ${e.nom}` : "—"; };

  const enregistrer = async () => {
    const max = Number(form.note_max) > 0 ? Number(form.note_max) : 20;
    const n = Number(form.note);
    if (!form.student_id || !form.matiere.trim() || form.note === "" || !Number.isFinite(n) || n < 0 || n > max) {
      setMessage(tr("Choisissez l'élève, la matière, et une note entre 0 et {max}.", { max })); return;
    }
    setEtat("envoi"); setMessage("");
    const d = await lire<{ grade?: NoteSaisie }>(`${base}/enseignant/notes`, {
      method: "POST",
      body: JSON.stringify({ classroom_id: classroomId, student_id: Number(form.student_id), matiere: form.matiere.trim(), note: n, note_max: max, periode: form.periode, annee_scolaire: annee }),
    });
    setEtat("pret");
    if (d.success && d.grade) {
      setNotes((p) => [d.grade as NoteSaisie, ...p]);
      setForm((f) => ({ ...f, student_id: "", note: "" }));
      setMessage(tr("✅ Note enregistrée"));
    } else setMessage(tr(d.message || "Erreur."));
  };

  const champ = "w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 bg-white";
  if (etat === "chargement") return <p className="text-sm text-slate-500 p-2">{tr("Chargement…")}</p>;
  if (etat === "erreur") return <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{tr(message)}</p>;

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-slate-100 p-3 space-y-2">
        <select value={form.student_id} onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))} className={champ}>
          <option value="">{tr("— Choisir l'élève —")}</option>
          {eleves.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
        </select>
        <input value={form.matiere} onChange={(e) => setForm((f) => ({ ...f, matiere: e.target.value }))} list="matieres-enseignant"
          placeholder={tr("Matière")} className={champ} />
        <datalist id="matieres-enseignant">{matieresClasse.map((m) => <option key={m} value={m} />)}</datalist>
        <div className="flex gap-2">
          <input type="number" inputMode="decimal" min="0" step="0.25" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder={tr("Note")} className={champ} />
          <span className="self-center text-slate-400 font-bold">/</span>
          <input type="number" inputMode="decimal" min="1" value={form.note_max} onChange={(e) => setForm((f) => ({ ...f, note_max: e.target.value }))}
            className={`${champ} max-w-[80px]`} aria-label={tr("Note sur")} />
        </div>
        <select value={form.periode} onChange={(e) => setForm((f) => ({ ...f, periode: e.target.value }))} className={champ}>
          {PERIODES.map((p) => <option key={p} value={p}>{tr(p)}</option>)}
        </select>
        <button type="button" onClick={() => void enregistrer()} disabled={etat === "envoi"}
          className="w-full py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-60" style={{ background: couleur }}>
          {etat === "envoi" ? tr("Enregistrement…") : tr("Enregistrer la note")}
        </button>
        {message && <p className={`text-sm rounded-lg p-2 ${message.startsWith("✅") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{message}</p>}
        {annee && <p className="text-xs text-slate-400">{tr("Année scolaire {annee}", { annee })}</p>}
      </div>
      <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">
        <p className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">{tr("Notes de la classe")}</p>
        {notes.length === 0 && <p className="text-sm text-slate-500 px-3 py-3">{tr("Aucune note pour le moment.")}</p>}
        {notes.slice(0, 50).map((n) => (
          <div key={n.id} className="flex items-center gap-2 px-3 py-2 text-sm">
            <span className="flex-1 min-w-0 truncate font-semibold text-slate-800">{nomEleve(n.student_id)}</span>
            <span className="text-slate-500 truncate max-w-[35%]">{tr(n.matiere)}</span>
            <span className="font-extrabold" style={{ color: couleur }}>{Number(n.note)}/{Number(n.note_max)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
