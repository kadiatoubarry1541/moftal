import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { config } from "../config/api";
import { CarteLivre, type Livre } from "../components/ecole/CoursEtBibliotheque";
import { useTraduction } from "../i18n/traduction";
import BarreAppMembre from "../components/ecole/BarreAppMembre";
import { cheminAppEcole } from "../utils/appEcole";
import { cheminConnexion } from "../utils/connexionRetour";

// Bibliothèque de l'école, pour ses membres (enseignants, élèves, parents) :
// les livres PDF ajoutés par le directeur.


export default function BibliothequeEcole({ mode = "school" }: { mode?: "school" | "madrasa" }) {
  const madrasa = mode === "madrasa";
  const VERT = madrasa ? "#0891b2" : "#1a8f1a";
  const { tenantCode = "" } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const { tr } = useTraduction();
  const [ecole, setEcole] = useState<{ nom: string; logo_url?: string | null } | null>(null);
  const [livres, setLivres] = useState<Livre[]>([]);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate(cheminConnexion(), { replace: true }); return; }
    fetch(`${config.API_BASE_URL}/${madrasa ? "madrasa-mgmt" : "school-mgmt"}/${encodeURIComponent(tenantCode)}/bibliotheque`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .then(({ ok, d }) => { if (ok && d.success) { setEcole(d.ecole); setLivres(d.livres); } else setErreur(d.message || "Accès refusé."); })
      .catch(() => setErreur("Erreur de connexion. Réessayez."));
  }, [tenantCode, navigate]);

  const q = recherche.trim().toLowerCase();
  const visibles = q ? livres.filter((l) => [l.titre, l.auteur, l.niveau].some((x) => String(x || "").toLowerCase().includes(q))) : livres;

  return (
    <div className="min-h-screen bg-gray-50">
      <BarreAppMembre mode={mode} tenantCode={tenantCode} nom={ecole?.nom} logoUrl={ecole?.logo_url} actif="bibliotheque" />
      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
        {erreur ? (
          <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{tr(erreur)}</p>
        ) : (
          <>
            {livres.length > 4 && (
              <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={tr("Rechercher un livre…")}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white" />
            )}
            {ecole && visibles.length === 0 && <p className="text-sm text-slate-500 text-center py-8">{tr("Aucun livre pour le moment.")}</p>}
            {visibles.map((l) => <CarteLivre key={l.id} livre={l} couleur={VERT} />)}
          </>
        )}
      </div>
    </div>
  );
}
