import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { config } from "../config/api";
import LogoEtablissement from "../components/LogoEtablissement";
import { heure, duree } from "../components/ecole/CoursEtBibliotheque";

// Espace de l'enseignant : il marque le début et la fin de chacun de ses cours.
// L'heure enregistrée est celle du serveur ; le directeur la voit dans
// « Pointage des cours » de la gestion de l'école.

const VERT = "#1a8f1a";
const jeton = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

interface Creneau { heure_debut?: string; heure_fin?: string; matiere?: string }
interface Classe { id: number; nom: string; niveau?: string; creneaux: Creneau[] }
interface Pointage { id: number; classroom_id: number; classe?: string; matiere?: string | null; debut: string; fin?: string | null }
interface Donnees {
  ecole: { nom: string; logo_url?: string | null };
  enseignant: { prenom: string; nom: string };
  jour: string; classes: Classe[]; pointages: Pointage[]; enCours: Pointage | null;
}

export default function EspaceEnseignantEcole() {
  const { tenantCode = "" } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [, setTic] = useState(0);
  const base = `${config.API_BASE_URL}/school-mgmt/${encodeURIComponent(tenantCode)}`;

  const charger = useCallback(() => {
    fetch(`${base}/enseignant/mes-cours`, { headers: jeton() })
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
      .then(({ ok, data }) => { if (ok && data.success) { setD(data); setErreur(""); } else setErreur(data.message || "Accès refusé."); })
      .catch(() => setErreur("Erreur de connexion. Réessayez."));
  }, [base]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login-membre", { state: { from: `/ecole/${tenantCode}/enseignant` } }); return; }
    charger();
  }, [charger, navigate, tenantCode]);

  // Le chronomètre du cours en cours avance chaque minute
  useEffect(() => { const t = setInterval(() => setTic((n) => n + 1), 30000); return () => clearInterval(t); }, []);

  const action = async (chemin: string, corps?: unknown) => {
    setOccupe(true);
    try {
      const r = await fetch(`${base}${chemin}`, { method: "POST", headers: jeton(), body: corps ? JSON.stringify(corps) : undefined });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.success) alert(data.message || "Erreur. Réessayez.");
      charger();
    } catch { alert("Erreur de connexion. Réessayez."); }
    finally { setOccupe(false); }
  };

  const debut = (c: Classe, cr?: Creneau) =>
    action("/enseignant/debut", { classroom_id: c.id, matiere: cr?.matiere || null, prevu_debut: cr?.heure_debut || null, prevu_fin: cr?.heure_fin || null });

  if (erreur) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-sm text-center">
        <p className="text-sm text-slate-700">{erreur}</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold">Retour</button>
      </div>
    </div>
  );
  if (!d) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Chargement…</div>;

  const enCours = d.enCours;
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-12 h-12 flex-shrink-0"><LogoEtablissement src={d.ecole.logo_url} name={d.ecole.nom} type="school" fontSize={18} /></div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900 truncate">{d.ecole.nom}</p>
            <p className="text-xs text-slate-500">{d.enseignant.prenom} {d.enseignant.nom} · {d.jour}</p>
          </div>
          <button onClick={() => navigate(`/ecole/${tenantCode}/bibliotheque`)} className="px-3 py-2 rounded-lg text-xs font-bold text-white" style={{ background: VERT }}>
            📚 Bibliothèque
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {enCours && (
          <div className="rounded-2xl p-4 text-white" style={{ background: VERT }}>
            <p className="text-xs opacity-80">Cours en cours</p>
            <p className="text-lg font-bold">{enCours.classe}{enCours.matiere ? ` · ${enCours.matiere}` : ""}</p>
            <p className="text-sm opacity-90">Commencé à {heure(enCours.debut)} · {duree(enCours.debut, null)}</p>
            <button disabled={occupe} onClick={() => action("/enseignant/fin")}
              className="mt-3 w-full py-3 rounded-xl bg-white text-red-600 font-bold disabled:opacity-60">⏹ Fin du cours</button>
          </div>
        )}

        <div className="space-y-3">
          {d.classes.length === 0 && (
            <div className="bg-white rounded-xl border p-6 text-center text-sm text-slate-500">
              Aucune classe ne vous est attribuée. Le directeur doit vous choisir dans l'emploi du temps de vos classes.
            </div>
          )}
          {d.classes.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-100 p-3">
              <p className="font-bold text-slate-900">{c.nom}</p>
              <div className="mt-2 space-y-2">
                {c.creneaux.map((cr, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm text-slate-700 flex-1">{cr.heure_debut}–{cr.heure_fin}{cr.matiere ? ` · ${cr.matiere}` : ""}</span>
                    <button disabled={occupe || !!enCours} onClick={() => debut(c, cr)}
                      className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={{ background: VERT }}>▶ Début du cours</button>
                  </div>
                ))}
                {c.creneaux.length === 0 && (
                  <button disabled={occupe || !!enCours} onClick={() => debut(c)}
                    className="w-full py-2 rounded-lg text-sm font-bold text-white disabled:opacity-40" style={{ background: VERT }}>▶ Début du cours</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {d.pointages.length > 0 && (
          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">Mes cours d'aujourd'hui</p>
            <div className="space-y-2">
              {d.pointages.map((p) => (
                <div key={p.id} className="bg-white rounded-lg border border-slate-100 px-3 py-2 text-sm flex items-center gap-2">
                  <span className="flex-1 text-slate-800">{p.classe}{p.matiere ? ` · ${p.matiere}` : ""}</span>
                  <span className="font-semibold" style={{ color: VERT }}>{heure(p.debut)}</span>
                  <span className="text-slate-400">→</span>
                  <span className="font-semibold text-slate-800">{p.fin ? heure(p.fin) : "en cours"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
