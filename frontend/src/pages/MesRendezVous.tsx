import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoEtablissement from "../components/LogoEtablissement";
import LieuRendezVous, { type PositionPro } from "../components/LieuRendezVous";
import { useTraduction } from "../i18n/traduction";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5002";

/**
 * Mes rendez-vous (côté client).
 * Les contacts du professionnel (téléphone, e-mail, adresse) n'apparaissent
 * qu'une fois le rendez-vous accepté : c'est le serveur qui les donne.
 */
interface RendezVous {
  id: string;
  type: "written" | "video";
  status: "pending" | "accepted" | "rejected" | "cancelled" | "completed" | string;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  service?: string | null;
  responseMessage?: string | null;
  createdAt?: string;
  professional: {
    id: string;
    name: string;
    type: string;
    photo?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    /** Point exact, repère et photo de façade : seulement pour un rendez-vous accepté */
    position?: PositionPro | null;
  } | null;
}

const STATUTS: Record<string, { label: string; classe: string }> = {
  pending: { label: "En attente", classe: "bg-amber-100 text-amber-800" },
  accepted: { label: "Accepté", classe: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Refusé", classe: "bg-red-100 text-red-700" },
  cancelled: { label: "Annulé", classe: "bg-gray-100 text-gray-600" },
  completed: { label: "Terminé", classe: "bg-blue-100 text-blue-700" },
};

export default function MesRendezVous() {
  const navigate = useNavigate();
  const { tr } = useTraduction();
  const [liste, setListe] = useState<RendezVous[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [lieuOuvert, setLieuOuvert] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    fetch(`${API_BASE}/api/appointments/my-appointments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.success) throw new Error(d.message || "");
        setListe(d.appointments || []);
      })
      .catch(() => setErreur(tr("Vos rendez-vous n'ont pas pu être chargés. Réessayez.")))
      .finally(() => setChargement(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chargé une seule fois
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate(-1)}
            className="min-h-[44px] px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg text-gray-700 dark:text-gray-200 font-medium"
          >
            {tr("← Retour")}
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">📅 {tr("Mes rendez-vous")}</h1>
        </div>

        {chargement ? (
          <p className="text-center text-gray-500 py-12">{tr("Chargement…")}</p>
        ) : erreur ? (
          <p className="text-center text-red-600 py-12">{erreur}</p>
        ) : liste.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">{tr("Vous n'avez encore demandé aucun rendez-vous.")}</p>
            <button
              onClick={() => navigate("/professionnels")}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
            >
              {tr("Trouver un professionnel")}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {liste.map((rdv) => {
              const pro = rdv.professional;
              const statut = STATUTS[rdv.status] || { label: rdv.status, classe: "bg-gray-100 text-gray-600" };
              const accepte = rdv.status === "accepted";
              return (
                <div key={rdv.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 shrink-0 rounded-xl overflow-hidden">
                      <LogoEtablissement src={pro?.photo} name={pro?.name} type={pro?.type} fontSize={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{pro?.name || tr("Professionnel")}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statut.classe}`}>{tr(statut.label)}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                        {rdv.type === "video"
                          ? tr("Demande par vidéo")
                          : [rdv.appointmentDate, rdv.appointmentTime && `${tr("à")} ${rdv.appointmentTime}`, rdv.service && `· ${rdv.service}`].filter(Boolean).join(" ")}
                      </p>
                      {rdv.responseMessage && (
                        <p className="text-sm text-gray-500 mt-1 italic">« {rdv.responseMessage} »</p>
                      )}
                    </div>
                  </div>

                  {accepte && pro && (pro.phone || pro.email || pro.address) && (
                    <div className="mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3">
                      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-2">{tr("Contacts du professionnel")}</p>
                      {(pro.address || pro.city) && (
                        <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">📍 {[pro.address, pro.city].filter(Boolean).join(", ")}</p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        {pro.phone && (
                          <a href={`tel:${pro.phone}`} className="flex-1 min-w-[140px] text-center px-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                            📞 {pro.phone}
                          </a>
                        )}
                        {pro.email && (
                          <a href={`mailto:${pro.email}`} className="flex-1 min-w-[140px] text-center px-3 py-2.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-sm font-semibold truncate">
                            ✉️ {pro.email}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  {accepte && pro?.position && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setLieuOuvert(lieuOuvert === rdv.id ? null : rdv.id)}
                        className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                      >
                        {lieuOuvert === rdv.id ? tr("Fermer la carte") : tr("📍 Voir le lieu du rendez-vous")}
                      </button>
                      {lieuOuvert === rdv.id && <LieuRendezVous rdvId={rdv.id} nom={pro.name} position={pro.position} />}
                    </div>
                  )}
                  {rdv.status === "pending" && (
                    <p className="mt-3 text-xs text-gray-500">{tr("Les contacts du professionnel s'afficheront ici dès qu'il aura accepté.")}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
