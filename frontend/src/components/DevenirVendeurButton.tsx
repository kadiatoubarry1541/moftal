import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/api';
import { useTraduction } from "../i18n/traduction";

type Secteur = 'primaire' | 'secondaire' | 'tertiaire' | 'quaternaire';

interface Props {
  /** Si fourni, le secteur est fixé (page détaillée). Sinon, secteur par défaut (page d'accueil). */
  secteur?: Secteur;
  className?: string;
}

// Vendeur (vend directement aux clients) et fournisseur (approvisionne la
// plateforme) : ouverts à tous les secteurs, chacun avec son formulaire
// ci-dessous. Le compte fournisseur est unique par personne ; le secteur
// d'où vient la demande est enregistré dans ses catégories.
type TypeActivite = 'individuel' | 'entreprise' | 'coopérative' | 'association';

export function DevenirVendeurButton({ secteur, className }: Props) {
  const navigate = useNavigate();
  const { tr } = useTraduction();
  const [open, setOpen] = useState(false);
  const [choix, setChoix] = useState<'menu' | 'vendeur' | 'fournisseur'>('menu');
  const [typeActivite, setTypeActivite] = useState<TypeActivite>('individuel');
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);
  const [nomBoutique, setNomBoutique] = useState('');
  const [description, setDescription] = useState('');
  const [telephone, setTelephone] = useState('');
  const [ville, setVille] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const secteurVendeur = secteur || 'primaire';

  const resetEtFermer = () => {
    setOpen(false);
    setChoix('menu');
    setMessage('');
    setNomBoutique('');
    setDescription('');
    setTelephone('');
    setVille('');
    setTypeActivite('individuel');
    setDemandeEnvoyee(false);
  };

  const ouvrirFournisseur = () => {
    setMessage('');
    setDemandeEnvoyee(false);
    setChoix('fournisseur');
  };

  // Demande de compte fournisseur, enregistrée sur le serveur (validée par l'admin)
  const soumettreFournisseur = async () => {
    if (nomBoutique.trim().length < 2) {
      setMessage(tr("Indiquez le nom de votre activité."));
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${config.API_BASE_URL}/exchange/suppliers`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: nomBoutique.trim(),
          businessType: typeActivite,
          description,
          categories: [secteurVendeur],
          contactInfo: { phone: telephone },
          address: { city: ville },
        }),
      });
      const data = await res.json().catch(() => ({}));
      setMessage(tr(data.message || (res.ok ? 'Demande envoyée avec succès.' : "Erreur lors de l'inscription.")));
      if (res.ok) setDemandeEnvoyee(true);
    } catch {
      setMessage(tr('Erreur réseau. Vérifiez votre connexion.'));
    } finally {
      setLoading(false);
    }
  };

  const soumettreVendeur = async () => {
    if (!nomBoutique.trim()) {
      setMessage(tr('Le nom de la boutique est obligatoire.'));
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${config.API_BASE_URL}/exchange/register-vendor`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomBoutique, description, secteur: secteurVendeur, telephone, ville }),
      });
      const data = await res.json();
      setMessage(tr(data.message || (data.success ? 'Demande envoyée avec succès.' : 'Erreur lors de l\'inscription.')));
    } catch {
      setMessage(tr('Erreur réseau. Vérifiez votre connexion.'));
    } finally {
      setLoading(false);
    }
  };

  // Commerçant qui a déjà son compte : jamais « Devenir vendeur » ; on lui dit
  // simplement ce qui manque (approbation en cours, ou abonnement à renouveler).
  const [compteCommercant, setCompteCommercant] = useState<'en_attente' | 'abonnement' | null>(null);
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    let fini = false;
    fetch(`${config.API_BASE_URL}/exchange/vendor-status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!fini && d?.success && d.compteCommercant) setCompteCommercant(d.compteCommercant); })
      .catch(() => {});
    return () => { fini = true; };
  }, []);

  if (compteCommercant === 'en_attente') {
    return (
      <span className={className || 'flex items-center gap-1.5 px-3 py-2 bg-amber-100 text-amber-800 text-sm font-semibold rounded-xl'}
        style={className ? { background: '#fef3c7', color: '#92400e' } : undefined}
        title={tr("Votre compte commerçant est en attente d'approbation : dès qu'il est approuvé, le bouton Publier apparaît ici.")}>
        {tr('⏳ Compte en attente d\'approbation')}
      </span>
    );
  }
  if (compteCommercant === 'abonnement') {
    return (
      <button type="button" onClick={() => navigate('/mes-comptes-pro')}
        className={className || 'flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors'}
        style={className ? { background: '#f59e0b' } : undefined}>
        {tr('🔄 Renouveler mon abonnement pour publier')}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || 'flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors'}
      >
        {tr('🛒 Vendre ou fournir')}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={resetEtFermer}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            {choix === 'menu' && (
              <>
                <div className="text-center py-2">
                  <div className="text-4xl mb-3">🛒</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{tr("Participer à Échange")}</h3>
                  <p className="text-sm text-gray-600">
                    {tr("Choisissez comment vous voulez participer : vendre directement aux clients, ou fournir/approvisionner la plateforme.")}
                  </p>
                </div>
                <div className="flex flex-col gap-3 mt-5">
                  <button onClick={() => setChoix('vendeur')} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors">
                    {tr("💰 Devenir vendeur")}
                  </button>
                  <button
                    onClick={ouvrirFournisseur}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
                  >
                    {tr("🚚 Devenir fournisseur")}
                  </button>
                  <button onClick={resetEtFermer} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors">
                    {tr("Fermer")}
                  </button>
                </div>
              </>
            )}

            {choix === 'vendeur' && (
              <>
                <div className="text-center py-1">
                  <div className="text-3xl mb-2">💰</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{tr("Devenir vendeur")}</h3>
                </div>
                <div className="flex flex-col gap-2.5">
                  <input
                    type="text"
                    placeholder={tr("Nom de la boutique *")}
                    value={nomBoutique}
                    onChange={e => setNomBoutique(e.target.value)}
                    className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder={tr("Téléphone")}
                    value={telephone}
                    onChange={e => setTelephone(e.target.value)}
                    className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder={tr("Ville")}
                    value={ville}
                    onChange={e => setVille(e.target.value)}
                    className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <textarea
                    placeholder={tr("Description (optionnel)")}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={2}
                    className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                  {message && <p className="text-sm text-center text-emerald-700">{message}</p>}
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setChoix('menu')} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors">
                    {tr("Retour")}
                  </button>
                  <button onClick={soumettreVendeur} disabled={loading} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors">
                    {loading ? tr('Envoi...') : tr('Envoyer')}
                  </button>
                </div>
              </>
            )}

            {choix === 'fournisseur' && (
              <>
                <div className="text-center py-1">
                  <div className="text-3xl mb-2">🚚</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{tr("Devenir fournisseur")}</h3>
                  <p className="text-xs text-gray-500">{tr("Votre demande sera validée par l'administrateur.")}</p>
                </div>
                {demandeEnvoyee ? (
                  <div className="text-center mt-4">
                    <p className="text-sm text-emerald-700 font-semibold">{message}</p>
                    <button onClick={resetEtFermer} className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors">
                      {tr("Fermer")}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-2.5 mt-3">
                      <input
                        type="text"
                        placeholder={tr("Nom de votre activité *")}
                        value={nomBoutique}
                        onChange={e => setNomBoutique(e.target.value)}
                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={typeActivite}
                        onChange={e => setTypeActivite(e.target.value as TypeActivite)}
                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="individuel">{tr("Individuel")}</option>
                        <option value="entreprise">{tr("Entreprise")}</option>
                        <option value="coopérative">{tr("Coopérative")}</option>
                        <option value="association">{tr("Association")}</option>
                      </select>
                      <input
                        type="text"
                        placeholder={tr("Téléphone")}
                        value={telephone}
                        onChange={e => setTelephone(e.target.value)}
                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder={tr("Ville")}
                        value={ville}
                        onChange={e => setVille(e.target.value)}
                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <textarea
                        placeholder={tr("Ce que vous fournissez (optionnel)")}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={2}
                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      {message && <p className="text-sm text-center text-red-600">{message}</p>}
                    </div>
                    <div className="flex gap-3 mt-5">
                      <button onClick={() => setChoix('menu')} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors">
                        {tr("Retour")}
                      </button>
                      <button onClick={soumettreFournisseur} disabled={loading} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors">
                        {loading ? tr('Envoi...') : tr('Envoyer')}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
