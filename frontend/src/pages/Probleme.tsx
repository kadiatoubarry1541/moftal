import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReçuTransaction } from "../components/ReçuTransaction";
import type { CompteFamille } from '../types/compteFamille';
import type { DonneesReçu } from '../components/ReçuTransaction';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  [key: string]: unknown;
}

export default function Probleme() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const navigate = useNavigate();
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [familyMedia, setFamilyMedia] = useState<Array<{
    id: string;
    authorName: string;
    mediaType: 'image' | 'video';
    description?: string | null;
    mediaUrl: string;
    created_at: string;
  }>>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  // Toutes les explications détaillées sont regroupées dans une seule fenêtre
  const [showAide, setShowAide] = useState(false);

  // Moftal Pay — paiement santé depuis problème familial
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5002';
  const [fundCompte, setFundCompte] = useState<CompteFamille | null>(null);
  const [showMoftalPay, setShowMoftalPay] = useState(false);
  const [moftalMontant, setMoftalMontant] = useState('');
  const [moftalBenef, setMoftalBenef] = useState('');
  const [moftalContact, setMoftalContact] = useState('');
  const [moftalRaison, setMoftalRaison] = useState('');
  const [moftalLoading, setMoftalLoading] = useState(false);
  const [moftalReçu, setMoftalReçu] = useState<DonneesReçu | null>(null);

  useEffect(() => {
    const session = localStorage.getItem("session_user");
    if (!session) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(session);
      const user = parsed.userData || parsed;
      if (!user || !user.numeroH) {
        navigate("/login");
        return;
      }
      setUserData(user);
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  // Charger le compte famille Moftal Pay pour paiement santé
  useEffect(() => {
    const loadFund = async () => {
      if (!userData) return;
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API}/api/family-fund/mon-compte`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.existe) setFundCompte(data.compte);
        }
      } catch { /* ignore */ }
    };
    loadFund();
  }, [userData, API]);

  const payerSante = async () => {
    const montant = parseInt(moftalMontant);
    if (!montant || montant < 100) return alert("Montant invalide");
    if (!moftalBenef) return alert("Indiquez le bénéficiaire (clinique ou médecin)");
    if (!fundCompte?.estAdmin) return alert("Seuls les administrateurs du compte peuvent effectuer des paiements.");
    setMoftalLoading(true);
    try {
      const token = localStorage.getItem("token");
      const r = await fetch(`${API}/api/family-fund/payer`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "paiement_sante",
          montant,
          beneficiaireNom: moftalBenef,
          beneficiaireContact: moftalContact,
          description: moftalRaison || "Problème de santé familial",
        }),
      });
      const d = await r.json();
      if (d.success) {
        setMoftalReçu({
          id: Date.now().toString(),
          type: "paiement_sante",
          montant,
          date: new Date().toISOString(),
          acteurNom: `${userData?.prenom || ""} ${userData?.nomFamille || ""}`.trim(),
          beneficiaireNom: moftalBenef,
          beneficiaireContact: moftalContact,
          description: moftalRaison || "Problème de santé familial",
          nomFamille: fundCompte?.nomFamille,
        });
        setMoftalMontant(""); setMoftalBenef(""); setMoftalContact(""); setMoftalRaison("");
        setShowMoftalPay(false);
      } else {
        alert(d.message);
      }
    } finally {
      setMoftalLoading(false);
    }
  };

  useEffect(() => {
    const loadMedia = async () => {
      if (!userData) return;
      try {
        setLoadingMedia(true);
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/api/family/problems/media`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        setFamilyMedia(data.items || []);
      } catch {
        // on garde la page même si la liste échoue
      } finally {
        setLoadingMedia(false);
      }
    };
    loadMedia();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé seulement quand ces valeurs changent (voulu)
  }, [userData]);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    try {
      setUploading(true);
      setUploadError(null);
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("media", file);
      formData.append("description", description);
      const res = await fetch(`${API}/api/family/problems/media`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setUploadError(data.message || "Impossible d'enregistrer la vidéo.");
        return;
      }
      setDescription("");
      setFamilyMedia((prev) => [data.item, ...prev]);
    } catch {
      setUploadError("Erreur réseau. Réessayez plus tard.");
    } finally {
      setUploading(false);
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-red-600 mx-auto" />
          <p className="mt-4 text-gray-600">
            Chargement de la caisse familiale...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header : titre, une phrase, et l'accès aux explications */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-start gap-3 py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">💰 Caisse</h1>
              <p className="mt-1 text-sm text-gray-600">Aider ensemble un membre de la famille malade.</p>
            </div>
            <button
              onClick={() => navigate("/famille/moi/arbre")}
              className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg transition-colors"
            >
              ← Mon arbre
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowAide(true)}
            className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold hover:bg-emerald-100"
          >
            ❓ Comment ça marche ?
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Numéro familial (pour les contributions) */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 sm:p-5">
          <h2 className="text-lg font-bold text-emerald-800">💳 Numéro de la famille</h2>
          <p className="text-sm text-emerald-900 mb-3">Partagez-le pour que chacun sache où envoyer l&apos;aide.</p>
          <div className="inline-flex items-center px-4 py-2 rounded-lg bg-white border border-emerald-300 shadow-sm">
            <span className="font-mono text-sm sm:text-base text-emerald-900">{userData.numeroH}</span>
          </div>
        </div>

        {/* Zone de partage des vidéos / preuves pour les problèmes de santé familiaux */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🏥 Santé de la famille</h2>
            <p className="text-sm text-gray-600">Montrez à la famille quand un membre est malade.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="flex-1 w-full">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Décrivez brièvement le problème de santé (facultatif)..."
                rows={2}
              />
            </div>
            <div>
              <label className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg cursor-pointer">
                <span>{uploading ? "Envoi..." : "📤 Publier une vidéo"}</span>
                <input
                  type="file"
                  accept="video/*,image/*"
                  data-duree-max-video="10"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // Vidéo : 10 secondes au maximum (vérifié par data-duree-max-video)
                    handleUpload(file);
                  }}
                />
              </label>
            </div>
          </div>
          {uploadError && (
            <p className="text-sm text-red-600">{uploadError}</p>
          )}

          <div className="mt-4 space-y-3">
            {loadingMedia ? (
              <p className="text-sm text-gray-500">Chargement des vidéos de la famille...</p>
            ) : familyMedia.length === 0 ? (
              <p className="text-sm text-gray-500">
                Aucune vidéo pour le moment.
              </p>
            ) : (
              familyMedia.map((m) => (
                <div
                  key={m.id}
                  className="border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row gap-3 items-start"
                >
                  <div className="w-full sm:w-64">
                    {m.mediaType === "video" ? (
                      <video src={m.mediaUrl} controls className="w-full h-40 bg-black rounded-lg" />
                    ) : (
                      <img src={m.mediaUrl} alt="" className="w-full h-40 object-cover rounded-lg" />
                    )}
                  </div>
                  <div className="flex-1 text-sm text-gray-700">
                    <p className="font-semibold text-gray-900 mb-1">{m.authorName}</p>
                    {m.description && <p className="mb-1">{m.description}</p>}
                    <p className="text-xs text-gray-500">
                      Partagé le {new Date(m.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Moftal Pay — Paiement santé depuis problème familial ─── */}
        <div className="rounded-xl shadow-sm p-4 sm:p-5 border border-emerald-200" style={{ background: 'linear-gradient(135deg,#f0fdf0,#dcfcdc)' }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">💰</span>
            <div>
              <h2 className="text-lg font-bold text-emerald-900">Moftal Pay — Santé</h2>
              <p className="text-sm text-emerald-700">
                {fundCompte
                  ? <>Solde santé disponible : <strong>{(fundCompte.soldes?.sante || 0).toLocaleString()} GNF</strong></>
                  : "Payer les soins avec l'argent de la famille."}
              </p>
            </div>
          </div>

          {/* Accès rapide à Moftal Pay (toujours visible) */}
          <button
            onClick={() => navigate('/compte-famille')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm mb-3"
            style={{ background: 'linear-gradient(135deg,#1a8f1a,#0891b2)' }}
          >
            💰 Compte Famille Moftal Pay
          </button>

          {fundCompte ? (
            <>
              {!fundCompte.estAdmin && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                  ⚠️ Seuls les responsables du compte peuvent payer.
                </p>
              )}

              {fundCompte.estAdmin && (
                <>
                  <button
                    onClick={() => setShowMoftalPay(v => !v)}
                    className="w-full py-2.5 rounded-xl text-white font-bold text-sm mb-3"
                    style={{ background: 'linear-gradient(135deg,#1a8f1a,#156315)' }}
                  >
                    {showMoftalPay ? '✕ Annuler' : '🏥 Payer une clinique ou médecin'}
                  </button>

                  {showMoftalPay && (
                    <div className="space-y-3 bg-white rounded-xl p-4 border border-emerald-100">
                      <p className="text-xs text-emerald-700 font-semibold">Paiement depuis la caisse santé de la famille</p>
                      <input type="number" value={moftalMontant} onChange={e => setMoftalMontant(e.target.value)}
                        placeholder="Montant en GNF" min="100"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none" />
                      <input type="text" value={moftalBenef} onChange={e => setMoftalBenef(e.target.value)}
                        placeholder="Clinique / médecin (bénéficiaire)"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none" />
                      <input type="text" value={moftalContact} onChange={e => setMoftalContact(e.target.value)}
                        placeholder="Numéro Orange Money ou MTN MoMo du bénéficiaire"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none" />
                      <textarea value={moftalRaison} onChange={e => setMoftalRaison(e.target.value)}
                        placeholder="Raison (ex: hospitalisation de Mamadou, 3 jours en clinique...)"
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none resize-none" />
                      <button onClick={payerSante} disabled={moftalLoading}
                        className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#1a8f1a,#156315)' }}>
                        {moftalLoading ? 'Traitement...' : '✅ Confirmer le paiement santé'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              Pas encore de Compte Famille : touchez le bouton ci-dessus.
            </p>
          )}
        </div>

        {/* Fenêtre « Comment ça marche ? » : toutes les explications détaillées */}
        {showAide && (
          <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
            onClick={() => setShowAide(false)}
          >
            <div
              className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 space-y-4 text-sm text-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">❓ Comment ça marche ?</h2>
                <button
                  type="button"
                  onClick={() => setShowAide(false)}
                  aria-label="Fermer"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                >✕</button>
              </div>

              <section>
                <h3 className="font-bold text-gray-900">💰 À quoi sert cette page ?</h3>
                <p>
                  C&apos;est la page d&apos;entraide de la famille : assistance santé et soutien aux membres dans le besoin
                  (maladie, situations difficiles). Quand quelqu&apos;un est malade, c&apos;est ici que l&apos;information et les
                  preuves (vidéos, photos) sont réunies.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-gray-900">💳 Numéro de la famille</h3>
                <p>
                  C&apos;est le <strong>numéro unique</strong> que la famille utilise pour contribuer et assister un membre
                  malade. Partagez-le dans la famille pour que tout le monde sache où envoyer l&apos;aide.
                </p>
                <p className="mt-1">
                  Plus tard, ce numéro pourra être relié à un compte (Orange Money, MTN MoMo ou banque) pour les contributions.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-gray-900">🏥 Santé de la famille</h3>
                <p>
                  Quand un membre de la famille est malade, publiez une <strong>vidéo</strong> (ou une photo) pour expliquer
                  la situation, avec une courte description si vous voulez.
                </p>
                <p className="mt-1">Seuls les membres qui ont le même nom de famille peuvent voir ces vidéos et photos.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-900">💰 Moftal Pay — Santé</h3>
                <p>
                  Le <strong>Compte Famille</strong> réunit l&apos;argent déposé par les membres. Sa partie « santé » sert
                  à payer directement une clinique ou un médecin.
                </p>
                <p className="mt-1">
                  Seuls les responsables (administrateurs) du Compte Famille peuvent faire un paiement. Chaque paiement
                  donne un reçu.
                </p>
                <p className="mt-1">
                  Si la famille n&apos;a pas encore de Compte Famille, le bouton « Compte Famille Moftal Pay » permet
                  d&apos;en créer un et de commencer à gérer le budget familial.
                </p>
              </section>
            </div>
          </div>
        )}

        {/* Reçu Moftal Pay */}
        {moftalReçu && (
          <ReçuTransaction
            id={moftalReçu.id}
            type={moftalReçu.type}
            montant={moftalReçu.montant}
            date={moftalReçu.date}
            acteurNom={moftalReçu.acteurNom}
            beneficiaireNom={moftalReçu.beneficiaireNom}
            beneficiaireContact={moftalReçu.beneficiaireContact}
            description={moftalReçu.description}
            nomFamille={moftalReçu.nomFamille}
            onClose={() => setMoftalReçu(null)}
          />
        )}
      </div>
    </div>
  );
}

