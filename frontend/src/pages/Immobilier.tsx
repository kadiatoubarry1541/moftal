import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/api';
import ProSection from '../components/ProSection';

const API_ORIGIN = (config.API_BASE_URL || '').replace(/\/api\/?$/, '') || '';

interface Annonce {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  location: string;
  images: string[];
  createdAt: string;
}

function buildImageUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

function AnnonceImage({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return <span className="text-3xl">🏠</span>;
}

export default function Immobilier() {
  const navigate = useNavigate();
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${config.API_BASE_URL}/exchange/tertiaire/products`);
        if (res.ok) {
          const data = await res.json();
          const maisons = (data.products || []).filter(
            (p: any) => p.category === 'Maison à louer'
          );
          setAnnonces(maisons);
        }
      } catch {
        // on garde le tableau vide
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <button
        type="button"
        onClick={() => navigate('/services')}
        className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors text-sm border border-gray-200"
      >
        ← Retour
      </button>

      <div className="mb-6 flex items-center gap-3 rounded-2xl bg-lime-700 px-4 py-3 text-white shadow-md">
        <span className="text-3xl leading-none">🏘️</span>
        <div>
          <h1 className="text-base font-bold leading-tight">Immobilier</h1>
          <p className="text-xs text-lime-100 mt-0.5">
            Location de maisons et agents immobiliers agréés
          </p>
        </div>
      </div>

      {/* Annonces maisons à louer */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
          Maisons à louer
        </h2>

        {loading ? (
          <p className="text-sm text-gray-400">Chargement des annonces…</p>
        ) : annonces.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Aucune annonce de location disponible pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {annonces.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-lime-200 bg-white dark:bg-gray-800 shadow-sm overflow-hidden"
              >
                <div className="w-full h-40 bg-lime-50 dark:bg-lime-900/20 flex items-center justify-center overflow-hidden">
                  <AnnonceImage src={buildImageUrl(a.images?.[0])} alt={a.title} />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-2">{a.title}</p>
                  {a.location && (
                    <p className="text-xs text-gray-500 mt-1">📍 {a.location}</p>
                  )}
                  <p className="text-sm font-bold text-lime-700 dark:text-lime-400 mt-1">
                    {a.price.toLocaleString()} {a.currency}
                  </p>
                  {a.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agents immobiliers */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
          Agents immobiliers agréés
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Contactez nos <strong>agents immobiliers agréés</strong> pour{' '}
          <strong>louer ou acheter</strong> un logement, un local commercial ou un terrain.
        </p>
        <ProSection
          type="broker"
          title="Agents immobiliers"
          icon="🏘️"
          description="Professionnels de l'immobilier pour la location et la vente de biens."
        />
      </div>
    </div>
  );
}
