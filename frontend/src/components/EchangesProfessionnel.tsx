import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/api';
import { DevenirVendeurButton } from './DevenirVendeurButton';
import PaymentModal from './PaymentModal';
import { useI18n } from '../i18n/useI18n';
import { CommanderProduitModal, CommandesRecues, MesCommandes } from './CommanderProduit';
import { useTraduction } from '../i18n/traduction';

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
  numeroH?: string;
  contactInfo?: { phone?: string };
}

function buildImageUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

function getSections(t: (key: string) => string) {
  return [
    {
      id: 'primaire',
      label: t('echange.sector_primaire'),
      subtitle: t('echange.sector_primaire_subtitle'),
      icons: ['🌾', '🐓', '🥬', '🐟'],
      color: 'green',
      placeholder: '🌾',
      path: '/echange/primaire',
    },
    {
      id: 'secondaire',
      label: t('echange.sector_secondaire'),
      subtitle: t('echange.sector_secondaire_subtitle'),
      icons: ['👗', '👟', '👜', '💄'],
      color: 'blue',
      placeholder: '🏭',
      path: '/echange/secondaire',
    },
    {
      id: 'tertiaire',
      label: t('echange.sector_tertiaire'),
      subtitle: t('echange.sector_tertiaire_subtitle'),
      icons: ['🛋️', '❄️', '🧱', '🔧'],
      color: 'amber',
      placeholder: '🧱',
      path: '/echange/tertiaire',
    },
    {
      id: 'quaternaire',
      label: t('echange.sector_quaternaire'),
      subtitle: t('echange.sector_quaternaire_subtitle'),
      icons: ['📱', '💻', '📺', '🚗'],
      color: 'violet',
      placeholder: '💻',
      path: '/echange/quaternaire',
    },
  ] as const;
}

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string }> = {
  green:  { bg: 'bg-green-600',  border: 'border-green-200',  text: 'text-green-600' },
  blue:   { bg: 'bg-blue-600',   border: 'border-blue-200',   text: 'text-blue-600' },
  amber:  { bg: 'bg-amber-600',  border: 'border-amber-200',  text: 'text-amber-600' },
  violet: { bg: 'bg-violet-600', border: 'border-violet-200', text: 'text-violet-600' },
};

export function EchangesProfessionnel() {
  const { t } = useI18n();
  const { tr } = useTraduction();
  const SECTIONS = getSections(t);
  const SUB_SECTOR_LABELS: Record<string, string> = {
    primaire: t('echange.sub_sector_alimentation'),
    secondaire: t('echange.sub_sector_mode_beaute'),
    tertiaire: t('echange.sub_sector_maison_construction'),
    quaternaire: t('echange.sub_sector_techno_vehicules'),
    nourriture: t('echange.sub_sector_restaurants'),
  };
  const navigate = useNavigate();
  const [productsBySection, setProductsBySection] = useState<Record<string, ExchangeProduct[]>>({});
  const [loadingBySection, setLoadingBySection] = useState<Record<string, boolean>>({
    primaire: true, secondaire: true, tertiaire: true, quaternaire: true,
  });
  const [selectedProduct, setSelectedProduct] = useState<ExchangeProduct | null>(null);
  const [activeSection, setActiveSection] = useState<string>('primaire');
  const [canPublish, setCanPublish] = useState(false);
  const [unpaidVendorAccounts, setUnpaidVendorAccounts] = useState<{ id: string; subSector: string }[]>([]);
  const [payingAccount, setPayingAccount] = useState<{ id: string; subSector: string; amount: number } | null>(null);
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
      .then(data => {
        if (!data?.success) return;
        const approvedAccounts: { id: string; subSector: string; aAcces: boolean }[] = data.approvedAccounts || [];
        const unpaid = approvedAccounts.filter(a => !a.aAcces);
        setUnpaidVendorAccounts(unpaid.map(a => ({ id: a.id, subSector: a.subSector })));
        setCanPublish(!!(data.isAdmin || approvedAccounts.some(a => a.aAcces)));
      })
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé seulement quand ces valeurs changent (voulu)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé seulement quand ces valeurs changent (voulu)
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openVendorPayment = async (account: { id: string; subSector: string }) => {
    try {
      const s = localStorage.getItem('session_user');
      const token = s ? JSON.parse(s).token : null;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${config.API_BASE_URL}/payment/prix-vendeur-echange?proId=${account.id}`, { headers });
      const data = await res.json();
      if (data?.success) setPayingAccount({ id: account.id, subSector: account.subSector, amount: data.mois });
    } catch {
      // silencieux — l'utilisateur peut réessayer
    }
  };

  return (
    <>
      {/* Header + raccourcis — jamais besoin de quitter cette page */}
      <header style={{ background: '#0f172a', position: 'sticky', top: 0, zIndex: 40, borderBottom: '2px solid #1e293b', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={() => navigate('/compte')}
              aria-label={t('services.back_aria')}
              style={{ background: 'none', color: 'white', border: 'none', padding: 0, cursor: 'pointer', fontSize: 34, fontWeight: 700, lineHeight: 1, opacity: 1 }}
            >
              ‹
            </button>
            <div>
              <h1 style={{ color: 'white', fontWeight: 800, fontSize: 12, letterSpacing: '-0.2px', margin: 0, lineHeight: 1 }}>🔄 {t('nav.echanges')}</h1>
              <p style={{ color: '#94a3b8', fontSize: 6, margin: 0, lineHeight: 1 }}>{t('echange.subtitle_scroll')}</p>
            </div>
          </div>
          {canPublish ? (
            <button
              type="button"
              onClick={() => navigate('/echange/publier')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#22a722', border: 'none', borderRadius: 8, padding: '2px 8px', color: 'white', fontWeight: 700, fontSize: 10, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}
            >
              {t('echange.publish_btn')}
            </button>
          ) : (
            <DevenirVendeurButton
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 rounded-lg px-2 py-0.5 text-white font-bold text-[10px] leading-none flex-shrink-0"
            />
          )}
        </div>

        {/* Barre de raccourcis — reste toujours visible, fait descendre la page sans jamais en sortir. Espacement (gap) garanti entre chaque bouton pour qu'aucun n'en touche un autre. */}
        <div className="flex gap-1.5" style={{ padding: '0 8px 0', marginTop: -1 }}>
          {SECTIONS.map(section => {
            const c = COLOR_CLASSES[section.color];
            const active = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0 py-0 text-[7px] font-bold transition rounded-lg leading-none ${
                  active ? c.bg + ' text-white' : 'bg-white/10 text-gray-300'
                }`}
              >
                <span className="text-[9px] leading-none">{section.icons[0]}</span>
                <span className="truncate max-w-full leading-none">{section.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {unpaidVendorAccounts.length > 0 && (
        <div className="max-w-3xl mx-auto px-3 sm:px-4 pt-3">
          {unpaidVendorAccounts.map(a => (
            <div key={a.id} className="flex items-center justify-between gap-2 mb-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs text-red-700 font-semibold">
                {t('echange.vendor_subscription_unpaid_before')}{SUB_SECTOR_LABELS[a.subSector] || a.subSector}{t('echange.vendor_subscription_unpaid_after')}
              </p>
              <button
                type="button"
                onClick={() => openVendorPayment(a)}
                className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                {t('echange.pay_btn')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Une seule page qui défile — les 4 catégories se suivent, jamais besoin de sortir */}
      <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-8">
        {/* Commandes : celles reçues (vendeur) et celles passées (acheteur) — vides, rien ne s'affiche */}
        <div className="pt-3">
          <CommandesRecues />
          <MesCommandes />
        </div>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-48 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 animate-pulse">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-400 rounded-full animate-spin" />
                      <span className="text-xs text-gray-400">{t('terre_adam.loading')}</span>
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
                  <p className="text-sm text-gray-500">{t('echange.no_product_in')} {section.label}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {products.map(product => (
                    <div key={product.id} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="text-left rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
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
                        {!!product.audio?.length && (
                          <span className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-white/95 shadow flex items-center justify-center text-base" title={tr("Message vocal du vendeur")}>🎤</span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{product.title}</p>
                        {product.subcategory && <p className="text-xs text-gray-500 truncate">{product.subcategory}</p>}
                        {Number(product.price) > 0 ? (
                          <p className="text-sm font-bold mt-1" style={{ color: '#1a8f1a' }}>{Number(product.price).toLocaleString()} {product.currency}</p>
                        ) : !!product.audio?.length && (
                          <p className="text-xs font-bold mt-1 text-amber-700">🎤 {tr("Prix dans le vocal")}</p>
                        )}
                        <span className="mt-2 block w-full text-center py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold">{tr("🛒 Commander")}</span>
                      </div>
                    </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Commander : la commande va à celui qui a publié (son Espace Pro) */}
      {selectedProduct && <CommanderProduitModal product={selectedProduct} couleur="#16a34a" onClose={() => setSelectedProduct(null)} />}

      {payingAccount && (
        <PaymentModal
          isOpen={!!payingAccount}
          onClose={() => setPayingAccount(null)}
          onSuccess={() => {
            setPayingAccount(null);
            setUnpaidVendorAccounts(prev => prev.filter(a => a.id !== payingAccount.id));
            setCanPublish(true);
          }}
          amount={payingAccount.amount}
          currency="GNF"
          purpose="vendeur_mois"
          relatedId={payingAccount.id}
          description={`${t('echange.subscription_desc_before')}${SUB_SECTOR_LABELS[payingAccount.subSector] || payingAccount.subSector}${t('echange.subscription_desc_after')}`}
        />
      )}
    </>
  );
}
