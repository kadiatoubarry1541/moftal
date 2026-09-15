import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/api';

type Secteur = 'primaire' | 'secondaire' | 'tertiaire' | 'quaternaire';

interface Props {
  /** Si fourni, le secteur est fixé (page détaillée). Sinon, secteur par défaut (page d'accueil). */
  secteur?: Secteur;
  className?: string;
}

// Fournisseur (approvisionne la plateforme) existe déjà pour Primaire et
// Secondaire. Vendeur (vend directement aux clients) reste ouvert à tous
// les secteurs via le formulaire ci-dessous.
const FOURNISSEUR_PATH: Record<Secteur, string | null> = {
  primaire: '/echange/primaire',
  secondaire: '/echange/secondaire',
  tertiaire: null,
  quaternaire: null,
};

export function DevenirVendeurButton({ secteur, className }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [choix, setChoix] = useState<'menu' | 'vendeur'>('menu');
  const [nomBoutique, setNomBoutique] = useState('');
  const [description, setDescription] = useState('');
  const [telephone, setTelephone] = useState('');
  const [ville, setVille] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fournisseurPath = secteur ? FOURNISSEUR_PATH[secteur] : '/echange/primaire';
  const secteurVendeur = secteur || 'primaire';

  const resetEtFermer = () => {
    setOpen(false);
    setChoix('menu');
    setMessage('');
    setNomBoutique('');
    setDescription('');
    setTelephone('');
    setVille('');
  };

  const goToFournisseur = () => {
    resetEtFermer();
    if (fournisseurPath) navigate(fournisseurPath);
  };

  const soumettreVendeur = async () => {
    if (!nomBoutique.trim()) {
      setMessage('Le nom de la boutique est obligatoire.');
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
      setMessage(data.message || (data.success ? 'Demande envoyée avec succès.' : 'Erreur lors de l\'inscription.'));
    } catch {
      setMessage('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || 'flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors'}
      >
        🛒 Vendre ou fournir
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={resetEtFermer}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            {choix === 'menu' && (
              <>
                <div className="text-center py-2">
                  <div className="text-4xl mb-3">🛒</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Participer à Échange</h3>
                  <p className="text-sm text-gray-600">
                    Choisissez comment vous voulez participer : vendre directement aux clients, ou fournir/approvisionner la plateforme.
                  </p>
                </div>
                <div className="flex flex-col gap-3 mt-5">
                  <button onClick={() => setChoix('vendeur')} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors">
                    💰 Devenir vendeur
                  </button>
                  <button onClick={goToFournisseur} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors">
                    🚚 Devenir fournisseur
                  </button>
                  {!fournisseurPath && (
                    <p className="text-xs text-amber-600 -mt-1">L'inscription fournisseur pour ce secteur arrive bientôt.</p>
                  )}
                  <button onClick={resetEtFermer} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors">
                    Fermer
                  </button>
                </div>
              </>
            )}

            {choix === 'vendeur' && (
              <>
                <div className="text-center py-1">
                  <div className="text-3xl mb-2">💰</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Devenir vendeur</h3>
                </div>
                <div className="flex flex-col gap-2.5">
                  <input
                    type="text"
                    placeholder="Nom de la boutique *"
                    value={nomBoutique}
                    onChange={e => setNomBoutique(e.target.value)}
                    className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Téléphone"
                    value={telephone}
                    onChange={e => setTelephone(e.target.value)}
                    className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Ville"
                    value={ville}
                    onChange={e => setVille(e.target.value)}
                    className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <textarea
                    placeholder="Description (optionnel)"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={2}
                    className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                  {message && <p className="text-sm text-center text-emerald-700">{message}</p>}
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setChoix('menu')} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors">
                    Retour
                  </button>
                  <button onClick={soumettreVendeur} disabled={loading} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors">
                    {loading ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
