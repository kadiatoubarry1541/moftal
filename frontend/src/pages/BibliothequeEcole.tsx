import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { config } from "../config/api";
import LogoEtablissement from "../components/LogoEtablissement";
import { CarteLivre, type Livre } from "../components/ecole/CoursEtBibliotheque";

// Bibliothèque de l'école, pour ses membres (enseignants, élèves, parents) :
// les livres PDF ajoutés par le directeur.


export default function BibliothequeEcole({ mode = "school" }: { mode?: "school" | "madrasa" }) {
  const madrasa = mode === "madrasa";
  const VERT = madrasa ? "#0891b2" : "#1a8f1a";
  const prefixe = madrasa ? "madrasa" : "ecole";
  const { tenantCode = "" } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [ecole, setEcole] = useState<{ nom: string; logo_url?: string | null } | null>(null);
  const [livres, setLivres] = useState<Livre[]>([]);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login-membre", { state: { from: `/${prefixe}/${tenantCode}/bibliotheque` } }); return; }
    fetch(`${config.API_BASE_URL}/${madrasa ? "madrasa-mgmt" : "school-mgmt"}/${encodeURIComponent(tenantCode)}/bibliotheque`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .then(({ ok, d }) => { if (ok && d.success) { setEcole(d.ecole); setLivres(d.livres); } else setErreur(d.message || "Accès refusé."); })
      .catch(() => setErreur("Erreur de connexion. Réessayez."));
  }, [tenantCode, navigate]);

  const q = recherche.trim().toLowerCase();
  const visibles = q ? livres.filter((l) => [l.titre, l.auteur, l.niveau].some((x) => String(x || "").toLowerCase().includes(q))) : livres;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Retour" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">‹</button>
          {ecole && <div className="w-10 h-10 flex-shrink-0"><LogoEtablissement src={ecole.logo_url} name={ecole.nom} type={mode} fontSize={16} /></div>}
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">📚 Bibliothèque</p>
            {ecole && <p className="text-xs text-slate-500 truncate">{ecole.nom}</p>}
          </div>
        </div>
      </div>
      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
        {erreur ? (
          <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{erreur}</p>
        ) : (
          <>
            {livres.length > 4 && (
              <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un livre…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white" />
            )}
            {ecole && visibles.length === 0 && <p className="text-sm text-slate-500 text-center py-8">Aucun livre pour le moment.</p>}
            {visibles.map((l) => <CarteLivre key={l.id} livre={l} couleur={VERT} />)}
          </>
        )}
      </div>
    </div>
  );
}
