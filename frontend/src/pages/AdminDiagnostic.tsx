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
  paiementsEchoues?: number | null;
  paiementsEnAttente?: number | null;
  modePaiement?: "reel" | "test" | "non_configure";
  residenceGroupes: number | null;
  formationsAnnonces: number | null;
}

interface ErreurSignalee {
  id: string;
  origine: "site" | "serveur";
  message: string;
  pile: string | null;
  adresse: string | null;
  navigateur: string | null;
  numero_h: string | null;
  occurrences: number;
  premiere_fois: string;
  derniere_fois: string;
  resolue: boolean;
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
  const [erreursJournal, setErreursJournal] = useState<ErreurSignalee[] | null>(null);
  const [ouverte, setOuverte] = useState<string | null>(null);

  // Journal des erreurs (site et serveur), enregistré en base
  const chargerJournal = useCallback(async () => {
    try {
      const r = await fetch(`${API}/erreurs/admin`, { headers });
      const d = await r.json();
      setErreursJournal(d.success ? d.erreurs : []);
    } catch {
      setErreursJournal([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé seulement quand ces valeurs changent (voulu)
  }, [API]);

  const resoudre = async (id: string) => {
    try {
      const r = await fetch(`${API}/erreurs/admin/${id}`, { method: "PATCH", headers, body: JSON.stringify({ resolue: true }) });
      if (r.ok) setErreursJournal((liste) => (liste || []).filter((e) => e.id !== id));
      else alert(tr("La modification n'a pas pu être enregistrée."));
    } catch {
      alert(tr("Impossible de contacter le serveur."));
    }
  };

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé seulement quand ces valeurs changent (voulu)
  }, [API]);

  useEffect(() => {
    verifier();
    chargerJournal();
  }, [verifier, chargerJournal]);

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
              <p className="text-sm font-bold text-gray-500 mb-3">{tr("💳 Paiements")}</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-400">{tr("Réussis")}</p>
                  <Chiffre valeur={donnees.paiementsReussis} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{tr("En attente")}</p>
                  <Chiffre valeur={donnees.paiementsEnAttente ?? null} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{tr("Échoués")}</p>
                  <Chiffre valeur={donnees.paiementsEchoues ?? null} />
                </div>
              </div>
              {donnees.modePaiement && (
                <p className={`mt-3 text-sm font-bold rounded-lg px-3 py-2 ${
                  donnees.modePaiement === "reel" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}>
                  {donnees.modePaiement === "reel"
                    ? tr("✅ Mode réel : les paiements encaissent de l'argent réel.")
                    : donnees.modePaiement === "test"
                      ? tr("🚨 Mode test : aucun argent réel n'est encaissé. Mettez DJOMY_ENV=production sur le serveur.")
                      : tr("🚨 Paiement non configuré : identifiants Djomy absents sur le serveur.")}
                </p>
              )}
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

        {/* Journal des erreurs */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-700">{tr("🚨 Erreurs à traiter")}</p>
            <button onClick={chargerJournal} className="text-xs font-semibold text-emerald-700 hover:underline">{tr("🔄 Actualiser")}</button>
          </div>
          {erreursJournal === null ? (
            <p className="text-sm text-gray-400">{tr("Chargement…")}</p>
          ) : erreursJournal.length === 0 ? (
            <p className="text-sm text-emerald-700 font-semibold">{tr("✅ Aucune erreur à traiter.")}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {erreursJournal.map((e) => (
                <li key={e.id} className="py-3">
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 text-[11px] font-bold rounded-full px-2 py-0.5 ${e.origine === "site" ? "bg-purple-100 text-purple-700" : "bg-red-100 text-red-700"}`}>
                      {e.origine === "site" ? tr("Site") : tr("Serveur")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 break-words">{e.message}</p>
                      <p className="text-xs text-gray-500 mt-0.5 break-words">
                        {[e.adresse, `${e.occurrences} ${tr("fois")}`, `${tr("dernière :")} ${new Date(e.derniere_fois).toLocaleString("fr-GN")}`, e.numero_h].filter(Boolean).join(" · ")}
                      </p>
                      {e.pile && (
                        <button onClick={() => setOuverte(ouverte === e.id ? null : e.id)} className="text-xs text-gray-400 hover:text-gray-600 mt-1">
                          {ouverte === e.id ? tr("▾ Masquer le détail") : tr("▸ Détail technique")}
                        </button>
                      )}
                      {ouverte === e.id && e.pile && (
                        <pre className="mt-1 text-[11px] bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words max-h-64">{e.pile}</pre>
                      )}
                    </div>
                    <button onClick={() => resoudre(e.id)} className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      {tr("✓ Résolue")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
          💡 {tr("Si un chiffre affiche")} <span className="font-bold">{tr("indisponible")}</span>{tr(", cela veut dire que cette partie n'a pas pu être vérifiée à cet instant — appuie sur « Vérifier maintenant » pour réessayer. Un chiffre à")} <span className="font-bold">0</span> {tr("veut dire que la table existe bien mais qu'aucune donnée n'y est encore enregistrée.")}
        </div>
      </div>
    </div>
  );
}
