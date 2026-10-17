import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { useTraduction } from "../i18n/traduction";

interface Donnees {
  utilisateurs: number | null;
  produits: {
    primaire: number | null;
    secondaire: number | null;
    tertiaire: number | null;
    quaternaire: number | null;
  };
  publicites: { total: number | null; enAttente: number | null; enLigne: number | null };
  comptesPro: { total: number | null; approuves: number | null; enAttente: number | null };
  paiementsReussis: number | null;
  residenceGroupes: number | null;
  formationsAnnonces: number | null;
}

function Chiffre({ valeur }: { valeur: number | null }) {
  const { tr } = useTraduction();
  if (valeur === null) {
    return <span className="text-amber-600 font-bold">{tr("indisponible")}</span>;
  }
  return <span className="text-2xl font-black text-gray-800">{valeur.toLocaleString("fr-GN")}</span>;
}

export default function AdminDiagnostic() {
  const navigate = useNavigate();
  const { tr } = useTraduction();
  const API = (config.API_BASE_URL || "http://localhost:5002/api");
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [verifieLe, setVerifieLe] = useState("");
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");

  const verifier = useCallback(async () => {
    setLoading(true);
    setErreur("");
    try {
      const r = await fetch(`${API}/admin/diagnostic-donnees`, { headers });
      const d = await r.json();
      if (d.success) {
        setDonnees(d.donnees);
        setVerifieLe(d.verifieLe);
      } else {
        setErreur(tr(d.message || "Erreur lors de la vérification."));
      }
    } catch {
      setErreur(tr("Impossible de contacter le serveur."));
    } finally {
      setLoading(false);
    }
  }, [API]);

  useEffect(() => {
    verifier();
  }, [verifier]);

  const fmtDate = (iso: string) =>
    iso ? new Date(iso).toLocaleString("fr-GN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 text-white px-6 py-5 flex items-center gap-4">
        <button onClick={() => navigate("/admin")} className="text-white/80 hover:text-white transition-colors">
          {tr("← Retour Admin")}
        </button>
        <div>
          <h1 className="text-2xl font-bold">{tr("🗄️ Vérification de la base de données")}</h1>
          <p className="text-emerald-200 text-sm mt-0.5">
            {tr("La preuve, en chiffres réels, que ce qui est publié sur le site est bien enregistré")}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
          <div>
            <p className="text-sm text-gray-500">
              {verifieLe ? <>{tr("Dernière vérification :")} <span className="font-semibold text-gray-700">{fmtDate(verifieLe)}</span></> : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{tr("Ces chiffres viennent directement de la vraie base de données, en cet instant.")}</p>
          </div>
          <button
            onClick={verifier}
            disabled={loading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {loading ? tr("⏳ Vérification...") : tr("🔄 Vérifier maintenant")}
          </button>
        </div>

        {erreur && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-semibold">
            ⚠️ {erreur}
          </div>
        )}

        {loading && !donnees ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : donnees ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-500 mb-1">{tr("👤 Utilisateurs inscrits")}</p>
              <Chiffre valeur={donnees.utilisateurs} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-500 mb-3">{tr("🛒 Produits publiés (Échanges)")}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">{tr("Primaire")}</p>
                  <Chiffre valeur={donnees.produits.primaire} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{tr("Secondaire")}</p>
                  <Chiffre valeur={donnees.produits.secondaire} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{tr("Tertiaire")}</p>
                  <Chiffre valeur={donnees.produits.tertiaire} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{tr("Quaternaire")}</p>
                  <Chiffre valeur={donnees.produits.quaternaire} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-500 mb-3">{tr("📣 Publicités")}</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-400">{tr("Total")}</p>
                  <Chiffre valeur={donnees.publicites.total} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{tr("En attente")}</p>
                  <Chiffre valeur={donnees.publicites.enAttente} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{tr("En ligne")}</p>
                  <Chiffre valeur={donnees.publicites.enLigne} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-500 mb-3">{tr("💼 Comptes professionnels")}</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-400">{tr("Total")}</p>
                  <Chiffre valeur={donnees.comptesPro.total} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{tr("Approuvés")}</p>
                  <Chiffre valeur={donnees.comptesPro.approuves} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{tr("En attente")}</p>
                  <Chiffre valeur={donnees.comptesPro.enAttente} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-500 mb-1">{tr("💳 Paiements réussis")}</p>
              <Chiffre valeur={donnees.paiementsReussis} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-500 mb-1">{tr("🌳 Groupes familiaux (Résidence)")}</p>
              <Chiffre valeur={donnees.residenceGroupes} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-500 mb-1">{tr("🎓 Annonces de formation")}</p>
              <Chiffre valeur={donnees.formationsAnnonces} />
            </div>
          </div>
        ) : null}

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
          💡 {tr("Si un chiffre affiche")} <span className="font-bold">{tr("indisponible")}</span>{tr(", cela veut dire que cette partie n'a pas pu être vérifiée à cet instant — appuie sur « Vérifier maintenant » pour réessayer. Un chiffre à")} <span className="font-bold">0</span> {tr("veut dire que la table existe bien mais qu'aucune donnée n'y est encore enregistrée.")}
        </div>
      </div>
    </div>
  );
}
