import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/api';
import { DevenirVendeurButton } from './DevenirVendeurButton';

const API_ORIGIN = (config.API_BASE_URL || '').replace(/\/api\/?$/, '') || '';

interface ExchangeProduct {
  id: string;
  title: string;
  description?: string;
  category?: string;
  subcategory?: string;
  price: number;
  currency: string;
  images?: string[];
  videos?: string[];
  audio?: string[];
  condition?: 'neuf' | 'bon' | 'moyen' | 'usé';
  location?: string;
  sellerName?: string;
  contactInfo?: { phone?: string };
}

interface EchangesProfessionnelProps {
  userData?: any;
}

function buildImageUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

const SECTIONS = [
  {
    id: 'primaire',
    label: 'Primaire',
    subtitle: 'Céréales · Légumes · Animaux · Poissons',
    icons: ['🌾', '🐓', '🥬', '🐟'],
    color: 'green',
    placeholder: '🌾',
    path: '/echange/primaire',
  },
  {
    id: 'secondaire',
    label: 'Secondaire',
    subtitle: 'Habits · Chaussures · Sacs · Cosmétiques',
    icons: ['👗', '👟', '👜', '💄'],
    color: 'blue',
    placeholder: '🏭',
    path: '/echange/secondaire',
  },
  {
    id: 'tertiaire',
    label: 'Tertiaire',
    subtitle: 'Meubles · Électroménager · Matériaux · Outils',
    icons: ['🛋️', '❄️', '🧱', '🔧'],
    color: 'amber',
    placeholder: '🧱',
    path: '/echange/tertiaire',
  },
  {
    id: 'quaternaire',
    label: 'Quaternaire',
    subtitle: 'Téléphones · Ordinateurs · TV · Voitures',
    icons: ['📱', '💻', '📺', '🚗'],
    color: 'violet',
    placeholder: '💻',
    path: '/echange/quaternaire',
  },
] as const;

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string }> = {
  green:  { bg: 'bg-green-600',  border: 'border-green-200',  text: 'text-green-600' },
  blue:   { bg: 'bg-blue-600',   border: 'border-blue-200',   text: 'text-blue-600' },
  amber:  { bg: 'bg-amber-600',  border: 'border-amber-200',  text: 'text-amber-600' },
  violet: { bg: 'bg-violet-600', border: 'border-violet-200', text: 'text-violet-600' },
};

export function EchangesProfessionnel({ userData: _u }: EchangesProfessionnelProps) {
  const navigate = useNavigate();
  const [productsBySection, setProductsBySection] = useState<Record<string, ExchangeProduct[]>>({});
  const [loadingBySection, setLoadingBySection] = useState<Record<string, boolean>>({
    primaire: true, secondaire: true, tertiaire: true, quaternaire: true,
  });
  const [selectedProduct, setSelectedProduct] = useState<ExchangeProduct | null>(null);
  const [activeSection, setActiveSection] = useState<string>('primaire');
  const [canPublish, setCanPublish] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Charge les produits réels de chaque catégorie (mêmes routes que les pages détaillées)
  useEffect(() => {
    const getToken = () => {
      try {
        const s = localStorage.getItem('session_user');
        return s ? JSON.parse(s).token : null;
      } catch { return null; }
    };
    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Le bouton "Publier" ne doit être visible que pour un vendeur déjà approuvé (ou un admin) —
    // pas pour quelqu'un qui se ferait refuser sa publication à la fin.
    fetch(`${config.API_BASE_URL}/exchange/vendor-status`, { headers })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.success) setCanPublish(!!(data.isVendor || data.isAdmin)); })
      .catch(() => {});

    SECTIONS.forEach(async (section) => {
      try {
        const res = await fetch(`${config.API_BASE_URL}/exchange/${section.id}/products`, { headers });
        if (res.ok) {
          const data = await res.json();
          setProductsBySection(prev => ({ ...prev, [section.id]: data.products || [] }));
        }
      } catch {
        // Garder vide, la section affichera "aucun produit"
      } finally {
        setLoadingBySection(prev => ({ ...prev, [section.id]: false }));
      }
    });
  }, []);

  // Le raccourci actif suit toujours la section réellement visible à l'écran
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id.replace('section-', ''));
      },
      { rootMargin: '-120px 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    SECTIONS.forEach(section => {
      const el = sectionRefs.current[section.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {/* Header + raccourcis — jamais besoin de quitter cette page */}
      <header style={{ background: '#0f172a', position: 'sticky', top: 0, zIndex: 40, borderBottom: '2px solid #1e293b', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={() => navigate('/compte')}
              aria-label="Retour à l'accueil"
              style={{ background: 'none', color: 'white', border: 'none', padding: 2, cursor: 'pointer', fontSize: 34, fontWeight: 700, lineHeight: 1, opacity: 1 }}
            >
              ‹
            </button>
            <div>
              <h1 style={{ color: 'white', fontWeight: 800, fontSize: 16, letterSpacing: '-0.2px', margin: 0 }}>🔄 Échanges</h1>
              <p style={{ color: '#94a3b8', fontSize: 11, margin: 0 }}>Fais défiler pour tout voir</p>
            </div>
          </div>
          {canPublish ? (
            <button
              type="button"
              onClick={() => navigate('/echange/publier')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#22a722', border: 'none', borderRadius: 10, padding: '8px 12px', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
            >
              ＋ Publier
            </button>
          ) : (
            <DevenirVendeurButton
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-2 text-white font-bold text-xs flex-shrink-0"
            />
          )}
        </div>

        {/* Barre de raccourcis — reste toujours visible, fait descendre la page sans jamais en sortir */}
        <div className="flex gap-1.5" style={{ padding: '0 8px 8px' }}>
          {SECTIONS.map(section => {
            const c = COLOR_CLASSES[section.color];
            const active = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-bold transition rounded-lg ${
                  active ? c.bg + ' text-white' : 'bg-white/10 text-gray-300'
                }`}
              >
                <span className="text-base leading-none">{section.icons[0]}</span>
                <span className="truncate max-w-[60px]">{section.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Une seule page qui défile — les 4 catégories se suivent, jamais besoin de sortir */}
      <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-8">
        {SECTIONS.map(section => {
          const products = productsBySection[section.id] || [];
          const loading = loadingBySection[section.id];
          return (
            <div
              key={section.id}
              id={`section-${section.id}`}
              ref={el => { sectionRefs.current[section.id] = el; }}
              className="scroll-mt-[112px] pt-5"
            >
              {/* Titre de section — icône + nom + flèche pour voir plus, comme Makiti */}
              <button
                type="button"
                onClick={() => navigate(section.path)}
                className="flex items-center gap-2 mb-3 w-full text-left"
              >
                <span className="text-lg leading-none">{section.icons[0]}</span>
                <p className="font-bold text-base text-gray-900 flex-1">{section.label}</p>
                <span className="text-xl text-gray-400 leading-none">›</span>
              </button>

              {loading ? (
                <div className="flex gap-3 overflow-hidden">
                  {[1, 2].map(i => (
                    <div key={i} className="h-48 w-40 flex-shrink-0 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
                  <p className="text-sm text-gray-500">Aucun produit pour l'instant dans {section.label}</p>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
                  {products.map(product => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="text-left rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex-shrink-0 w-40"
                    >
                      <div className="w-full h-36 bg-gray-100 relative">
                        {product.images?.[0] ? (
                          <img src={buildImageUrl(product.images[0])} alt={product.title} className="w-full h-full object-cover" />
                        ) : product.videos?.[0] ? (
                          <>
                            <video src={buildImageUrl(product.videos[0])} className="w-full h-full object-cover" muted playsInline />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <span className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-sm">▶️</span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">{section.placeholder}</div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{product.title}</p>
                        {product.subcategory && <p className="text-xs text-gray-500 truncate">{product.subcategory}</p>}
                        {product.price > 0 && (
                          <p className="text-sm font-bold mt-1" style={{ color: '#1a8f1a' }}>{product.price.toLocaleString()} {product.currency}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de contact — même logique que sur les pages détaillées */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedProduct(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {selectedProduct.images?.[0] && (
              <img src={buildImageUrl(selectedProduct.images[0])} alt={selectedProduct.title} className="w-full h-48 object-cover rounded-xl mb-4" />
            )}
            {!selectedProduct.images?.[0] && selectedProduct.videos?.[0] && (
              <video src={buildImageUrl(selectedProduct.videos[0])} controls className="w-full h-48 object-cover rounded-xl mb-4 bg-black" />
            )}
            {selectedProduct.audio?.[0] && (
              <audio src={buildImageUrl(selectedProduct.audio[0])} controls className="w-full mb-4" />
            )}
            <h3 className="text-lg font-bold text-gray-900 mb-4">Contacter le vendeur</h3>
            <div className="space-y-3">
              <div>
                <p className="font-bold text-gray-900">{selectedProduct.title}</p>
                {selectedProduct.sellerName && <p className="text-sm text-gray-600">{selectedProduct.sellerName}</p>}
              </div>
              {selectedProduct.price > 0 && (
                <p className="text-xl font-bold text-green-600">
                  {selectedProduct.price.toLocaleString()} {selectedProduct.currency}
                </p>
              )}
              <p className="text-sm text-gray-600">
                📞 {selectedProduct.contactInfo?.phone || 'Non renseigné'}
              </p>
              {selectedProduct.location && (
                <p className="text-sm text-gray-600">📍 {selectedProduct.location}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="mt-6 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
