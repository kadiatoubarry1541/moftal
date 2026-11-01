import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { config } from "../config/api";
import { heure, duree } from "../components/ecole/formatEcole";
import { useTraduction } from "../i18n/traduction";
import BarreAppMembre from "../components/ecole/BarreAppMembre";
import { cheminConnexion } from "../utils/connexionRetour";
import { getPhotoUrl } from "../utils/auth";

// Espace de l'enseignant : « Aujourd'hui » (début et fin de chaque cours),
// « Mes classes » (matières, liste des apprenants avec photo et matricule) et
// « Emploi du temps » (sa semaine dans toutes ses classes).
// L'heure enregistrée est celle du serveur ; le directeur la voit dans
// « Pointage des cours » de la gestion de l'école.

const jeton = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

interface Creneau { jour?: string; heure_debut?: string; heure_fin?: string; matiere?: string }
interface Apprenant { id: number; prenom: string; nom: string; photo_url?: string | null; numero_matricule?: string | null }
interface Classe { id: number; nom: string; niveau?: string; creneaux: Creneau[]; semaine?: Creneau[]; matieres?: string[]; apprenants?: Apprenant[] }
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
interface Pointage { id: number; classroom_id: number; classe?: string; matiere?: string | null; debut: string; fin?: string | null }
interface Donnees {
  ecole: { nom: string; logo_url?: string | null };
  enseignant: { prenom: string; nom: string; specialite?: string | null };
  jour: string; classes: Classe[]; pointages: Pointage[]; enCours: Pointage | null;
}

export default function EspaceEnseignantEcole({ mode = "school" }: { mode?: "school" | "madrasa" }) {
  const madrasa = mode === "madrasa";
  const VERT = madrasa ? "#0891b2" : "#1a8f1a";
  const { tenantCode = "" } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const { tr } = useTraduction();
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [, setTic] = useState(0);
  const [onglet, setOnglet] = useState<"jour" | "classes" | "semaine">("jour");
  const [ouverte, setOuverte] = useState<number | null>(null);
  const base = `${config.API_BASE_URL}/${madrasa ? "madrasa-mgmt" : "school-mgmt"}/${encodeURIComponent(tenantCode)}`;

  const charger = useCallback(() => {
    fetch(`${base}/enseignant/mes-cours`, { headers: jeton() })
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
      .then(({ ok, data }) => { if (ok && data.success) { setD(data); setErreur(""); } else setErreur(data.message || "Accès refusé."); })
      .catch(() => setErreur("Erreur de connexion. Réessayez."));
  }, [base]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate(cheminConnexion(), { replace: true }); return; }
    charger();
  }, [charger, navigate, tenantCode]);

  // Le chronomètre du cours en cours avance chaque minute
  useEffect(() => { const t = setInterval(() => setTic((n) => n + 1), 30000); return () => clearInterval(t); }, []);

  const action = async (chemin: string, corps?: unknown) => {
    setOccupe(true);
    try {
      const r = await fetch(`${base}${chemin}`, { method: "POST", headers: jeton(), body: corps ? JSON.stringify(corps) : undefined });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.success) alert(tr(data.message || "Erreur. Réessayez."));
      charger();
    } catch { alert(tr("Erreur de connexion. Réessayez.")); }
    finally { setOccupe(false); }
  };

  const debut = (c: Classe, cr?: Creneau) =>
    action("/enseignant/debut", { classroom_id: c.id, matiere: cr?.matiere || null, prevu_debut: cr?.heure_debut || null, prevu_fin: cr?.heure_fin || null });

  if (erreur) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-sm text-center">
        <p className="text-sm text-slate-700">{tr(erreur)}</p>
        <button onClick={charger} className="mt-4 px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold">{tr("🔄 Réessayer")}</button>
      </div>
    </div>
  );
  if (!d) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">{tr("Chargement…")}</div>;

  const enCours = d.enCours;
  return (
    <div className="min-h-screen bg-gray-50">
      <BarreAppMembre mode={mode} tenantCode={tenantCode} nom={d.ecole.nom} logoUrl={d.ecole.logo_url} actif="enseignant" />
      <div className="max-w-xl mx-auto px-4 pt-4">
        <p className="font-bold text-slate-900">{tr("🧑‍🏫 Mes cours")}</p>
        <p className="text-xs text-slate-500">{d.enseignant.prenom} {d.enseignant.nom} · {tr(d.jour)}</p>
        <div className="flex gap-1 mt-3 bg-white rounded-xl border border-slate-100 p-1">
          {([["jour", tr("Aujourd'hui")], ["classes", tr("Mes classes")], ["semaine", tr("Emploi du temps")]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setOnglet(id)} className="flex-1 py-2 rounded-lg text-xs font-bold"
              style={onglet === id ? { background: VERT, color: "white" } : { color: "#475569" }}>{label}</button>
          ))}
        </div>
      </div>

      {onglet === "classes" && (
        <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
          {d.classes.length === 0 && <div className="bg-white rounded-xl border p-6 text-center text-sm text-slate-500">{tr("Aucune classe ne vous est attribuée pour le moment.")}</div>}
          {d.classes.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-100 p-4">
              <button className="w-full flex items-center gap-3 text-start" onClick={() => setOuverte(ouverte === c.id ? null : c.id)}>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900">{c.nom}{c.niveau ? <span className="text-xs font-semibold text-slate-500"> · {tr(c.niveau)}</span> : null}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {(c.matieres && c.matieres.length ? c.matieres : d.enseignant.specialite ? [d.enseignant.specialite] : []).map(m => tr(m)).join(" · ") || tr("Matière à préciser dans l'emploi du temps")}
                  </p>
                </div>
                {c.apprenants && <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "#f0fdf4", color: VERT }}>{tr("{n} apprenant(s)", { n: c.apprenants.length })}</span>}
                <span className="text-slate-400">{ouverte === c.id ? "▲" : "▼"}</span>
              </button>
              {ouverte === c.id && (
                <div className="mt-3 divide-y divide-slate-100">
                  {(c.apprenants || []).length === 0 && <p className="text-sm text-slate-500 py-2">{tr("Aucun apprenant dans cette classe pour le moment.")}</p>}
                  {(c.apprenants || []).map((a) => (
                    <div key={a.id} className="flex items-center gap-3 py-2">
                      <span className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: VERT }}>
                        {a.photo_url ? <img src={getPhotoUrl(a.photo_url) || ""} alt="" className="w-full h-full object-cover" /> : a.prenom?.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{a.prenom} {a.nom}</p>
                        {a.numero_matricule && <p className="text-xs font-mono text-slate-500">{a.numero_matricule}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {onglet === "semaine" && (
        <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
          {(() => {
            const tous = d.classes.flatMap((c) => (c.semaine || []).map((cr) => ({ ...cr, classe: c.nom })));
            if (!tous.length) return <div className="bg-white rounded-xl border p-6 text-center text-sm text-slate-500">{tr("Votre emploi du temps n'est pas encore rempli. Le directeur le remplit dans chaque classe.")}</div>;
            return JOURS.filter((j) => tous.some((cr) => cr.jour === j)).map((j) => (
              <div key={j} className="bg-white rounded-xl border border-slate-100 p-3">
                <p className="font-bold text-sm mb-2" style={{ color: j === d.jour ? VERT : "#0f172a" }}>{tr(j)}{j === d.jour ? ` · ${tr("aujourd'hui")}` : ""}</p>
                <div className="space-y-1.5">
                  {tous.filter((cr) => cr.jour === j).sort((a, b) => String(a.heure_debut).localeCompare(String(b.heure_debut))).map((cr, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs font-bold text-slate-600 w-24">{cr.heure_debut}–{cr.heure_fin}</span>
                      <span className="flex-1 text-slate-800">{cr.matiere ? tr(cr.matiere) : "—"}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#f0fdf4", color: VERT }}>{cr.classe}</span>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {onglet === "jour" && <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {enCours && (
          <div className="rounded-2xl p-4 text-white" style={{ background: VERT }}>
            <p className="text-xs opacity-80">{tr("Cours en cours")}</p>
            <p className="text-lg font-bold">{enCours.classe}{enCours.matiere ? ` · ${tr(enCours.matiere)}` : ""}</p>
            <p className="text-sm opacity-90">{tr("Commencé à {heure}", { heure: heure(enCours.debut) })} · {duree(enCours.debut, null)}</p>
            <button disabled={occupe} onClick={() => action("/enseignant/fin")}
              className="mt-3 w-full py-3 rounded-xl bg-white text-red-600 font-bold disabled:opacity-60">{tr("⏹ Fin du cours")}</button>
          </div>
        )}

        <div className="space-y-3">
          {d.classes.length === 0 && (
            <div className="bg-white rounded-xl border p-6 text-center text-sm text-slate-500">
              {tr("Aucune classe ne vous est attribuée. Le directeur doit vous choisir dans l'emploi du temps de vos classes.")}
            </div>
          )}
          {d.classes.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-100 p-3">
              <p className="font-bold text-slate-900">{c.nom}</p>
              <div className="mt-2 space-y-2">
                {c.creneaux.map((cr, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm text-slate-700 flex-1">{cr.heure_debut}–{cr.heure_fin}{cr.matiere ? ` · ${tr(cr.matiere)}` : ""}</span>
                    <button disabled={occupe || !!enCours} onClick={() => debut(c, cr)}
                      className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={{ background: VERT }}>{tr("▶ Début du cours")}</button>
                  </div>
                ))}
                {c.creneaux.length === 0 && (
                  <button disabled={occupe || !!enCours} onClick={() => debut(c)}
                    className="w-full py-2 rounded-lg text-sm font-bold text-white disabled:opacity-40" style={{ background: VERT }}>{tr("▶ Début du cours")}</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {d.pointages.length > 0 && (
          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">{tr("Mes cours d'aujourd'hui")}</p>
            <div className="space-y-2">
              {d.pointages.map((p) => (
                <div key={p.id} className="bg-white rounded-lg border border-slate-100 px-3 py-2 text-sm flex items-center gap-2">
                  <span className="flex-1 text-slate-800">{p.classe}{p.matiere ? ` · ${tr(p.matiere)}` : ""}</span>
                  <span className="font-semibold" style={{ color: VERT }}>{heure(p.debut)}</span>
                  <span className="text-slate-400">→</span>
                  <span className="font-semibold text-slate-800">{p.fin ? heure(p.fin) : tr("en cours")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>}
    </div>
  );
}
