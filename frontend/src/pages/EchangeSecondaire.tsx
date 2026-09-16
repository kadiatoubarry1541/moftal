import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/api';
import { sortAnyByProximity, anyProximityLabel, getUserGeoContext, requestGPS, type UserGeoContext } from '../utils/proximity';
import { VideoRecorder } from '../components/VideoRecorder';
import { AudioRecorder } from '../components/AudioRecorder';
import { PublierAnnonceButtons } from '../components/PublierAnnonceButtons';
import { DevenirVendeurButton } from '../components/DevenirVendeurButton';
import { useI18n } from '../i18n/useI18n';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  role?: string;
  [key: string]: any;
}

interface ExchangeProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  level: 'secondaire';
  price: number;
  currency: string;
  images: string[];
  videos: string[];
  audio?: string[];
  condition: 'neuf' | 'bon' | 'moyen' | 'usé';
  location: string;
  seller: string;
  sellerName: string;
  contactInfo: any;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
}

interface Supplier {
  id: string;
  numeroH: string;
  businessName: string;
  businessType: string;
  description: string;
  categories: string[];
  contactInfo: any;
  address: any;
  documents: any[];
  isActive: boolean;
  isApproved: boolean;
  rating: number;
  totalSales: number;
  createdAt: string;
}

const API_ORIGIN = (config.API_BASE_URL || '').replace(/\/api\/?$/, '') || '';

function buildImageUrl(p: string | undefined): string | undefined {
  if (!p) return undefined;
  if (p.startsWith('http')) return p;
  return `${API_ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`;
}

function getSecondaireTabs(t: (key: string) => string) {
  return [
    { key: 'tous',       emoji: '🛍️', label: t('echange_tertiaire.tab_tous'),       keywords: [] },
    { key: 'femme',      emoji: '👗', label: t('echange_secondaire.tab_femme'),      keywords: ['femme','robe','jupe','tailleur','boubou femme','soutien','lingerie','pagn'] },
    { key: 'homme',      emoji: '👔', label: t('echange_secondaire.tab_homme'),      keywords: ['homme','chemise','pantalon','costume','boubou homme','djellaba','grand boubou','veste','cravate'] },
    { key: 'enfant',     emoji: '👶', label: t('echange_secondaire.tab_enfant'),     keywords: ['enfant','bébé','bebe','garçon','fille','scolaire','école','cartable'] },
    { key: 'chaussures', emoji: '👟', label: t('echange_secondaire.tab_chaussures'), keywords: ['chaussure','basket','sandale','talon','soulier','botte','sneaker','mocassin','ballerine','tong'] },
    { key: 'sacs',       emoji: '👜', label: t('echange_secondaire.tab_sacs'),       keywords: ['sac','valise','bagage','portefeuille','ceinture','maroquinerie'] },
    { key: 'bijoux',     emoji: '💍', label: t('echange_secondaire.tab_bijoux'),     keywords: ['bijou','montre','collier','bracelet','bague','boucle','or','argent','fantaisie','alliance'] },
    { key: 'beaute',     emoji: '💄', label: t('echange_secondaire.tab_beaute'),     keywords: ['cosmétique','cosmetique','crème','creme','parfum','maquillage','rouge à lèvres','fond de teint','savon','perruque','cheveux','lotion','vernis'] },
    { key: 'textile',    emoji: '🧵', label: t('echange_secondaire.tab_textile'),    keywords: ['tissu','textile','coton','wax','bazin','soie','fil','broderie','dentelle','pagne','laine','mousseline'] },
    { key: 'vehicules',  emoji: '🚗', label: t('echange_quaternaire.tab_vehicules'),  keywords: ['voiture','moto','véhicule','vehicule','scooter','vélo','velo','camion','auto','4x4','suv','berline','pick-up','taxi'] },
    { key: 'machines',   emoji: '⚙️', label: t('echange_secondaire.tab_machines'),   keywords: ['machine','générateur','generateur','groupe électrogène','pompe','moteur','tracteur','compresseur','soudure','industriel','perceuse'] },
  ] as const;
}

export default function EchangeSecondaire() {
  const { t } = useI18n();
  const SECONDAIRE_TABS = useMemo(() => getSecondaireTabs(t), [t]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [rawProducts, setRawProducts] = useState<ExchangeProduct[]>([]);
  const [rawSuppliers, setRawSuppliers] = useState<Supplier[]>([]);
  const [userGeo, setUserGeo] = useState<UserGeoContext>(getUserGeoContext());
  const [gpsActive, setGpsActive] = useState(false);
  const products = useMemo(() => sortAnyByProximity(rawProducts, userGeo), [rawProducts, userGeo]);
  const suppliers = useMemo(() => sortAnyByProximity(rawSuppliers, userGeo), [rawSuppliers, userGeo]);
  const [loading, setLoading] = useState(true);
  const [canPublish, setCanPublish] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showSupplierRegistration, setShowSupplierRegistration] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ExchangeProduct | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [activeStyleTab, setActiveStyleTab] = useState<'tous'|'femme'|'homme'|'enfant'|'chaussures'|'sacs'|'bijoux'|'beaute'|'textile'|'vehicules'|'machines'>('tous');
  const [publishMode, setPublishMode] = useState<null | 'ecrit' | 'photo_audio' | 'video'>(null);
  const navigate = useNavigate();

  const [newProduct, setNewProduct] = useState({
    title: '',
    description: '',
    category: '',
    price: 0,
    currency: 'FG',
    condition: 'bon' as 'neuf' | 'bon' | 'moyen' | 'usé',
    location: '',
    images: [] as File[],
    videos: [] as File[],
    photoForAudio: null as File | null,
    audio30s: null as File | null
  });

  const [newSupplier, setNewSupplier] = useState({
    businessName: '',
    businessType: 'individuel' as 'individuel' | 'entreprise' | 'coopérative' | 'association',
    description: '',
    categories: [''],
    contactInfo: {
      phone: '',
      email: '',
      website: ''
    },
    address: {
      street: '',
      city: '',
      region: '',
      country: 'Pays'
    }
  });

  useEffect(() => {
    // Charger les produits même sans connexion (vitrine publique)
    const session = localStorage.getItem("session_user");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        const user = parsed.userData || parsed;
        if (user?.numeroH) setUserData(user);
      } catch { /* pas connecté */ }
    }
    loadData();

    // Le bouton "Publier" ne doit être visible que pour un vendeur déjà approuvé (ou un admin)
    const token = localStorage.getItem("token");
    if (token) {
      fetch(`${config.API_BASE_URL}/exchange/vendor-status`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data?.success) setCanPublish(!!(data.isAdmin || data.approvedSectors?.includes('secondaire'))); })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    requestGPS().then(coords => {
      if (coords) { setUserGeo(prev => ({ ...prev, coords })); setGpsActive(true); }
    });
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem("token");
      
      // Charger les produits secondaires
      const productsEndpoint = `${config.API_BASE_URL}/exchange/secondaire/products`;
      const productsResponse = await fetch(productsEndpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setRawProducts(productsData.products || []);
      } else {
        setRawProducts(getDefaultProducts());
      }

      // Charger les fournisseurs
      const suppliersEndpoint = `${config.API_BASE_URL}/exchange/suppliers`;
      const suppliersResponse = await fetch(suppliersEndpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (suppliersResponse.ok) {
        const suppliersData = await suppliersResponse.json();
        setRawSuppliers(suppliersData.suppliers || []);
      } else {
        setRawSuppliers([]);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setRawProducts(getDefaultProducts());
      setRawSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultProducts = (): ExchangeProduct[] => [
    {
      id: '1',
      title: 'Téléphone Portable Samsung',
      description: 'Smartphone Samsung Galaxy en excellent état, avec accessoires complets.',
      category: 'Électronique',
      level: 'secondaire',
      price: 450000,
      currency: 'FG',
      images: [],
      videos: [],
      condition: 'bon',
      location: 'Ville Principale',
      seller: userData?.numeroH || 'G0C0P0R0E0F0 0',
      sellerName: `${userData?.prenom} ${userData?.nomFamille}`,
      contactInfo: { phone: '+224 123 456 789' },
      isActive: true,
      isApproved: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Machine à Coudre Industrielle',
      description: 'Machine à coudre professionnelle pour atelier de couture.',
      category: 'Machinerie',
      level: 'secondaire',
      price: 1200000,
      currency: 'FG',
      images: [],
      videos: [],
      condition: 'bon',
      location: 'Kindia',
      seller: 'G0C0P0R0E0F0 0',
      sellerName: 'Atelier Textile ABC',
      contactInfo: { phone: '+224 987 654 321' },
      isActive: true,
      isApproved: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      title: 'Générateur Diesel 5KVA',
      description: 'Générateur diesel de 5KVA, idéal pour usage professionnel.',
      category: 'Équipement',
      level: 'secondaire',
      price: 2500000,
      currency: 'FG',
      images: [],
      videos: [],
      condition: 'moyen',
      location: 'Labé',
      seller: 'G0C0P0R0E0F0 0',
      sellerName: 'Équipements Pro',
      contactInfo: { phone: '+224 555 123 456' },
      isActive: true,
      isApproved: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '4',
      title: 'Véhicule Utilitaire',
      description: 'Pick-up Toyota Hilux 2018, parfait pour transport de marchandises.',
      category: 'Automobile',
      level: 'secondaire',
      price: 45000000,
      currency: 'FG',
      images: [],
      videos: [],
      condition: 'bon',
      location: 'Ville Principale',
      seller: 'G0C0P0R0E0F0 0',
      sellerName: 'Auto Import',
      contactInfo: { phone: '+224 666 777 888' },
      isActive: true,
      isApproved: true,
      createdAt: new Date().toISOString()
    }
  ];

  const createProduct = async () => {
    try {
      if (!newProduct.title.trim() || !newProduct.category || !newProduct.price || !newProduct.location.trim()) {
        alert("Remplissez le titre, la catégorie, le prix et la localisation.");
        return;
      }
      if (publishMode === 'ecrit' && newProduct.images.length === 0) {
        alert("Ajoutez au moins une photo.");
        return;
      }
      if (publishMode === 'photo_audio' && (!newProduct.photoForAudio || !newProduct.audio30s)) {
        alert("Ajoutez une photo et enregistrez un message vocal (max 1 min).");
        return;
      }
      if (publishMode === 'video' && newProduct.videos.length === 0) {
        alert("Enregistrez une vidéo de présentation.");
        return;
      }

      const formData = new FormData();
      formData.append('title', newProduct.title);
      formData.append('description', newProduct.description.trim() || 'Produit présenté');
      formData.append('category', newProduct.category);
      formData.append('price', newProduct.price.toString());
      formData.append('currency', newProduct.currency);
      formData.append('condition', newProduct.condition);
      formData.append('location', newProduct.location);
      formData.append('seller', userData?.numeroH || '');
      formData.append('sellerName', `${userData?.prenom} ${userData?.nomFamille}`);
      
      // Ajouter les images
      newProduct.images.forEach((image, index) => {
        formData.append(`image_${index}`, image);
      });
      
      // Ajouter les vidéos
      newProduct.videos.forEach((video, index) => {
        formData.append(`video_${index}`, video);
      });
      if (newProduct.photoForAudio) formData.append(`image_${newProduct.images.length}`, newProduct.photoForAudio);
      if (newProduct.audio30s) formData.append('audio_0', newProduct.audio30s);

      const token = localStorage.getItem("token");
      const endpoint = `${config.API_BASE_URL}/exchange/secondaire/products`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        alert('Produit créé avec succès !');
        setShowCreateProduct(false);
        setPublishMode(null);
        setNewProduct({
          title: '',
          description: '',
          category: '',
          price: 0,
          currency: 'FG',
          condition: 'bon',
          location: '',
          images: [],
          videos: [],
          photoForAudio: null,
          audio30s: null
        });
        loadData();
      } else {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          alert("⛔ " + (errData.message || "Votre compte vendeur Moftal (secteur Mode & Beauté) doit être approuvé par un administrateur avant de pouvoir publier."));
        } else {
          alert("Erreur lors de la création du produit : " + (errData.message || response.status));
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert("Erreur de connexion. Vérifiez votre connexion internet et réessayez.");
    }
  };

  const registerSupplier = async () => {
    try {
      const token = localStorage.getItem("token");
      const endpoint = `${config.API_BASE_URL}/exchange/suppliers`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessName: newSupplier.businessName,
          businessType: newSupplier.businessType,
          description: newSupplier.description,
          categories: newSupplier.categories.filter(c => c.trim() !== ''),
          contactInfo: newSupplier.contactInfo,
          address: newSupplier.address
        })
      });
      
      if (response.ok) {
        alert('Demande d\'inscription envoyée ! Vous serez contacté après validation.');
        setShowSupplierRegistration(false);
        setNewSupplier({
          businessName: '',
          businessType: 'individuel',
          description: '',
          categories: [''],
          contactInfo: { phone: '', email: '', website: '' },
          address: { street: '', city: '', region: '', country: 'Pays' }
        });
        loadData();
      } else {
        alert('Erreur lors de l\'inscription');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'inscription');
    }
  };

  const approveSupplier = async (supplierId: string) => {
    try {
      const token = localStorage.getItem("token");
      const endpoint = `${config.API_BASE_URL}/exchange/suppliers/${supplierId}/approve`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        alert('Fournisseur approuvé avec succès !');
        loadData();
      } else {
        alert('Erreur lors de l\'approbation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'approbation');
    }
  };

  const rejectSupplier = async (supplierId: string) => {
    try {
      const token = localStorage.getItem("token");
      const endpoint = `${config.API_BASE_URL}/exchange/suppliers/${supplierId}/reject`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        alert('Demande de fournisseur rejetée.');
        loadData();
      } else {
        alert('Erreur lors du rejet');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du rejet');
    }
  };

  const isAdmin = userData?.role === 'admin' || userData?.role === 'super-admin' || userData?.numeroH === 'G0C0P0R0E0F0 0';

  const getFilteredProducts = () => {
    if (!products || !Array.isArray(products)) return [];
    if (activeStyleTab === 'tous') return products;
    const tab = SECONDAIRE_TABS.find(t => t.key === activeStyleTab);
    if (!tab || tab.keywords.length === 0) return products;
    return products.filter(p => {
      if (!p) return false;
      const text = `${p.title} ${p.category} ${p.description} ${p.subcategory || ''}`.toLowerCase();
      return (tab.keywords as readonly string[]).some(k => text.includes(k));
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">{t('echange_secondaire.loading')}</div>
        </div>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/echange')}
        className="mb-4 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
      >
        {t('btn.back_arrow')}
      </button>

      {/* Bannière proximité */}
      {(userGeo.city || userGeo.country || gpsActive) && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-4">
          <span className="text-base">{gpsActive ? "📡" : "📍"}</span>
          <span>{gpsActive ? t('echange_tertiaire.gps_sorted') : `${t('echange_tertiaire.location_sorted_before')} ${userGeo.city || userGeo.country} ${t('echange_tertiaire.location_sorted_after')}`}</span>
        </div>
      )}

      {/* ── Vendeur Officiel Moftal ── */}
      <div className="mb-6 rounded-2xl overflow-hidden shadow-lg border-2 border-yellow-400 dark:border-yellow-500">
        <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-2 flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <span className="text-white font-bold text-sm tracking-wide uppercase">{t('echange_tertiaire.official_vendor_label')}</span>
          <span className="ml-auto bg-white text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">{t('echange_tertiaire.official_badge')}</span>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <span className="text-5xl">🛍️</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white">{t('echange_secondaire.industry_title')}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('echange_secondaire.industry_desc')}
            </p>
          </div>
          <a
            href="mailto:support@moftal.com"
            className="flex-shrink-0 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {t('echange_tertiaire.contact_us_btn')}
          </a>
        </div>
      </div>

      {/* Bannière en-tête Secondaire */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 mb-6 text-white shadow-lg">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="text-5xl">🛍️</span>
          <h1 className="text-2xl font-bold">{t('echange_secondaire.header_title')}</h1>
          <p className="text-blue-100 text-sm">{t('echange_secondaire.header_subtitle')}</p>
        </div>
        {products.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-3 text-center">{t('echange_secondaire.products_preview')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {products.slice(0, 3).map((p) => (
                <div key={p.id} className="flex gap-2 rounded-lg overflow-hidden bg-white/20 border border-white/30 backdrop-blur-sm">
                  <div className="w-16 h-16 flex-shrink-0 bg-white/20 flex items-center justify-center text-2xl rounded-l-lg overflow-hidden">
                    {(p.images as any)?.[0] ? (
                      <img src={buildImageUrl((p.images as any)[0])} alt={p.title} className="w-full h-full object-cover" />
                    ) : '🛍️'}
                  </div>
                  <div className="flex-1 min-w-0 py-2 pr-2 flex flex-col justify-center">
                    <p className="text-sm font-medium text-white truncate">{p.title}</p>
                    <p className="text-xs font-semibold text-blue-100">{Number(p.price).toLocaleString()} {p.currency}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation sous-catégories visuelles */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('echange_tertiaire.what_looking_for')}</p>
        <div className="overflow-x-auto pb-2 -mx-1">
          <div className="flex gap-2 px-1 min-w-max">
            {SECONDAIRE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveStyleTab(tab.key as any)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 min-w-[60px] ${
                  activeStyleTab === tab.key
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <span className="text-2xl">{tab.emoji}</span>
                <span className="text-center leading-tight">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            {canPublish ? (
              <PublierAnnonceButtons
                onSelect={(mode) => { setShowCreateProduct(true); setPublishMode(mode); }}
                title={t('echange_secondaire.publish_ad_title')}
              />
            ) : (
              <DevenirVendeurButton secteur="secondaire" />
            )}
          </div>
          {isAdmin && (
            <button
              onClick={() => setSelectedSupplier({} as Supplier)}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all flex items-center gap-2 shrink-0 text-sm font-semibold"
            >
              <span>⚙️</span>
              <span>{t('echange_secondaire.manage_suppliers_btn')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Formulaire de création de produit */}
      {showCreateProduct && publishMode !== null && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => { setPublishMode(null); setShowCreateProduct(false); }} className="text-gray-500 hover:text-gray-700">←</button>
            <div className="text-3xl">🏭</div>
            <h3 className="text-2xl font-bold text-gray-900">
              {publishMode === 'ecrit' && t('echange_tertiaire.publish_written_title')}
              {publishMode === 'photo_audio' && t('echange_tertiaire.publish_photo_audio_title')}
              {publishMode === 'video' && t('echange_tertiaire.publish_video_title')}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {publishMode === 'ecrit' && (<>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('echange_primaire.product_title_label')}</label>
              <input
                type="text"
                value={newProduct.title}
                onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
                placeholder={t('echange_secondaire.product_title_placeholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('echange_tertiaire.category_label')}</label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
              >
                <option value="">{t('echange_primaire.select_category')}</option>
                <optgroup label={t('echange_secondaire.optgroup_mode')}>
                  <option value="Vêtement">Vêtement</option>
                  <option value="Chaussure">Chaussure</option>
                  <option value="Sac">Sac</option>
                  <option value="Accessoire">Accessoire</option>
                </optgroup>
                <optgroup label={t('echange_secondaire.optgroup_textile')}>
                  <option value="Textile">Textile</option>
                  <option value="Tissu">Tissu</option>
                  <option value="Coton">Coton</option>
                  <option value="Broderie">Broderie</option>
                  <option value="Filature">Filature</option>
                </optgroup>
                <optgroup label={t('echange_quaternaire.optgroup_vehicules')}>
                  <option value="Voiture">Voiture</option>
                  <option value="Moto">Moto</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Vélo">Vélo</option>
                  <option value="Camion">Camion</option>
                  <option value="Autre véhicule">Autre véhicule</option>
                </optgroup>
                <optgroup label={t('echange_secondaire.optgroup_machinery')}>
                  <option value="Machine à coudre">Machine à coudre</option>
                  <option value="Générateur">Générateur / Groupe électrogène</option>
                  <option value="Pompe à eau">Pompe à eau</option>
                  <option value="Compresseur">Compresseur / Outillage</option>
                  <option value="Électroménager">Électroménager (frigo, clim…)</option>
                  <option value="Machine industrielle">Machine industrielle</option>
                  <option value="Tracteur / Engin">Tracteur / Engin agricole</option>
                  <option value="Autre équipement">Autre équipement</option>
                </optgroup>
                <optgroup label={t('echange_secondaire.optgroup_other')}>
                  <option value="Machinerie">Machinerie</option>
                  <option value="Équipement">Équipement</option>
                  <option value="Mobilier">Mobilier</option>
                  <option value="Outillage">Outillage</option>
                  <option value="Autre">Autre</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('echange_tertiaire.price_label')}</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
                  placeholder="450000"
                />
                <select
                  value={newProduct.currency}
                  onChange={(e) => setNewProduct({...newProduct, currency: e.target.value})}
                  className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
                >
                  <option value="FG">FG</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('echange_quaternaire.condition_label')}</label>
              <select
                value={newProduct.condition}
                onChange={(e) => setNewProduct({...newProduct, condition: e.target.value as any})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
              >
                <option value="neuf">{t('echange_primaire.condition_new')}</option>
                <option value="bon">{t('echange_quaternaire.condition_good')}</option>
                <option value="moyen">{t('echange_quaternaire.condition_medium')}</option>
                <option value="usé">{t('echange_quaternaire.condition_worn_badge')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('echange_tertiaire.location_label')}</label>
              <input
                type="text"
                value={newProduct.location}
                onChange={(e) => setNewProduct({...newProduct, location: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
                placeholder={t('echange_primaire.location_placeholder')}
              />
            </div>
            </>)}
            {publishMode === 'photo_audio' && (
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('echange_secondaire.photo_audio_label')}</label>
              <p className="text-xs text-gray-500 mb-2">{t('echange_secondaire.photo_audio_desc')}</p>
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <div>
                  <span className="block text-xs font-medium text-gray-600 mb-1">{t('echange_secondaire.photo_item_label')}</span>
                  <input type="file" accept="image/*" capture="environment" onChange={(e) => setNewProduct((prev) => ({ ...prev, photoForAudio: e.target.files?.[0] || null }))} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-800" />
                  {newProduct.photoForAudio && <p className="mt-1 text-xs text-green-600">{t('echange_tertiaire.photo_selected')}</p>}
                </div>
                <div>
                  <span className="block text-xs font-medium text-gray-600 mb-1">{t('echange_primaire.voice_message_label')}</span>
                  <AudioRecorder maxDuration={5} onAudioRecorded={(blob) => setNewProduct((prev) => ({ ...prev, audio30s: new File([blob], `audio-30s-${Date.now()}.webm`, { type: blob.type || 'audio/webm' }) }))} />
                  {newProduct.audio30s && <p className="mt-2 text-xs text-green-600">{t('echange_tertiaire.audio_recorded')}</p>}
                </div>
              </div>
            </div>
            )}
            {publishMode === 'video' && (
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('echange_primaire.video_label')}</label>
              <p className="text-xs text-gray-500 mb-2">{t('echange_secondaire.video_desc')}</p>
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4">
                <VideoRecorder
                  maxDuration={5}
                  onVideoRecorded={(blob) => {
                    const file = new File([blob], `video-${Date.now()}.webm`, { type: blob.type || 'video/webm' });
                    setNewProduct((prev) => ({ ...prev, videos: [file, ...prev.videos] }));
                  }}
                />
                {newProduct.videos.length > 0 && <p className="mt-2 text-sm text-green-600 font-medium">{t('echange_tertiaire.video_recorded')}</p>}
              </div>
            </div>
            )}
            {publishMode === 'ecrit' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('echange_tertiaire.photos_label')}</label>
              <div className="space-y-3">
                <input type="file" id="media-capture-secondaire" accept="image/*" capture="environment" multiple className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
                    setNewProduct(p => ({ ...p, images: [...p.images, ...files] }));
                  }}
                />
                <input type="file" id="media-gallery-secondaire" accept="image/*" multiple className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
                    setNewProduct(p => ({ ...p, images: [...p.images, ...files] }));
                  }}
                />
                <div className="flex gap-3">
                  <label htmlFor="media-capture-secondaire" className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 cursor-pointer text-center font-medium">
                    {t('echange_primaire.take_photo_btn')}
                  </label>
                  <label htmlFor="media-gallery-secondaire" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer text-center font-medium">
                    {t('echange_primaire.choose_gallery_btn')}
                  </label>
                </div>
                {newProduct.images.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-green-600 font-medium mb-3">✅ {newProduct.images.length} {t('echange_tertiaire.photos_count_suffix')}</p>
                    <div className="grid grid-cols-3 gap-3">
                      {newProduct.images.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img src={URL.createObjectURL(img)} alt="" className="w-full h-24 object-cover rounded-lg border-2 border-green-300" />
                          <button onClick={() => setNewProduct(p => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
            {publishMode === 'ecrit' && (
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('echange_tertiaire.description_label')}</label>
              <textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
                rows={4}
                placeholder={t('echange_primaire.description_placeholder')}
              />
            </div>
            )}
          </div>
          
          <div className="flex gap-4 mt-8">
            <button
              onClick={createProduct}
              className="px-8 py-4 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              {t('echange_primaire.publish_product_btn')}
            </button>
            <button
              onClick={() => setShowCreateProduct(false)}
              className="px-8 py-4 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all duration-200 font-semibold"
            >
              {t('echange_primaire.cancel_with_icon')}
            </button>
          </div>
        </div>
      )}

      {/* Formulaire d'inscription fournisseur */}
      {showSupplierRegistration && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-3xl">🏢</div>
            <h3 className="text-2xl font-bold text-gray-900">{t('echange_primaire.become_supplier_title')}</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('echange_primaire.business_name_label')}</label>
              <input
                type="text"
                value={newSupplier.businessName}
                onChange={(e) => setNewSupplier({...newSupplier, businessName: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder={t('echange_secondaire.business_name_placeholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('echange_primaire.business_type_label')}</label>
              <select
                value={newSupplier.businessType}
                onChange={(e) => setNewSupplier({...newSupplier, businessType: e.target.value as any})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              >
                <option value="individuel">{t('echange_primaire.biztype_individual')}</option>
                <option value="entreprise">{t('echange_primaire.biztype_company')}</option>
                <option value="coopérative">{t('echange_primaire.biztype_coop')}</option>
                <option value="association">{t('echange_primaire.biztype_association')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('echange_primaire.phone_label')}</label>
              <input
                type="tel"
                value={newSupplier.contactInfo.phone}
                onChange={(e) => setNewSupplier({
                  ...newSupplier, 
                  contactInfo: {...newSupplier.contactInfo, phone: e.target.value}
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder="+224 123 456 789"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('echange_primaire.email_label')}</label>
              <input
                type="email"
                value={newSupplier.contactInfo.email}
                onChange={(e) => setNewSupplier({
                  ...newSupplier, 
                  contactInfo: {...newSupplier.contactInfo, email: e.target.value}
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder="contact@entreprise.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('echange_primaire.city_label')}</label>
              <input
                type="text"
                value={newSupplier.address.city}
                onChange={(e) => setNewSupplier({
                  ...newSupplier, 
                  address: {...newSupplier.address, city: e.target.value}
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder={t('echange_primaire.city_placeholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('echange_primaire.region_label')}</label>
              <select
                value={newSupplier.address.region}
                onChange={(e) => setNewSupplier({
                  ...newSupplier, 
                  address: {...newSupplier.address, region: e.target.value}
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              >
                <option value="">{t('echange_primaire.select_region')}</option>
                <option value="Zone Côtière">{t('echange_primaire.zone_coastal')}</option>
                <option value="Zone Montagneuse">{t('echange_primaire.zone_mountain')}</option>
                <option value="Zone Agricole">{t('echange_primaire.zone_agricultural')}</option>
                <option value="Zone Forestière">{t('echange_primaire.zone_forest')}</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t('echange_primaire.activity_description_label')}</label>
              <textarea
                value={newSupplier.description}
                onChange={(e) => setNewSupplier({...newSupplier, description: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                rows={4}
                placeholder={t('echange_primaire.activity_description_placeholder')}
              />
            </div>
          </div>
          
          <div className="flex gap-4 mt-8">
            <button
              onClick={registerSupplier}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              {t('echange_primaire.send_request_btn')}
            </button>
            <button
              onClick={() => setShowSupplierRegistration(false)}
              className="px-8 py-4 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all duration-200 font-semibold"
            >
              {t('echange_primaire.cancel_with_icon')}
            </button>
          </div>
        </div>
      )}

      {/* Liste des produits */}
      <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {getFilteredProducts().length === 0 ? (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-600 text-lg">{t('echange_primaire.no_products')}</p>
              <button
                onClick={() => setShowCreateProduct(true)}
                className="mt-4 px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all duration-200"
              >
                {t('echange_primaire.publish_first_product_btn')}
              </button>
            </div>
          ) : (
            getFilteredProducts().map((product) => (
          <div key={product.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-blue-100 hover:border-blue-300">
            {product.images && product.images.length > 0 ? (
              <img src={buildImageUrl(product.images[0])} alt={product.title}
                className="w-full h-48 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
            ) : product.videos && product.videos.length > 0 ? (
              <video
                src={buildImageUrl(product.videos[0])}
                className="w-full h-48 object-cover"
                autoPlay muted loop playsInline
                onError={(e) => { (e.target as HTMLVideoElement).style.display='none'; }}
              />
            ) : product.audio && product.audio.length > 0 ? (
              <div className="w-full h-48 bg-amber-50 flex flex-col items-center justify-center gap-2 px-4">
                <span className="text-4xl">🎙️</span>
                <p className="text-xs text-amber-700 font-medium text-center">{t('echange_tertiaire.voice_message_vendor')}</p>
                <audio src={buildImageUrl(product.audio[0])} controls className="w-full" />
              </div>
            ) : (
              <div className="w-full h-48 bg-blue-50 flex flex-col items-center justify-center gap-2">
                <span className="text-5xl">📷</span>
                <p className="text-xs text-gray-400">{t('echange_tertiaire.no_photo_yet')}</p>
              </div>
            )}
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base mb-1">{product.title}</h3>
                  <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                    {product.subcategory || product.category}
                  </span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                  product.condition === 'neuf' ? 'bg-green-100 text-green-800' :
                  product.condition === 'bon' ? 'bg-blue-100 text-blue-800' :
                  product.condition === 'moyen' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {product.condition}
                </div>
              </div>
              {product.description && <p className="text-gray-600 mb-3 text-sm line-clamp-2">{product.description}</p>}
              <div className="mb-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-3 text-white">
                <div className="text-xl font-black">{product.price.toLocaleString()} {product.currency}</div>
              </div>
              <div className="text-sm text-gray-600 mb-3 flex items-center gap-1">
                <span>📍</span><span>{product.location}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedProduct(product)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold"
                >
                  {t('echange_primaire.contact_btn')}
                </button>
              </div>
            </div>
          </div>
            ))
          )}
        </div>
      </div>

      {/* Fournisseurs visibles pour tous (liste publique) */}
      {suppliers.filter(s => s.isApproved).length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-3xl">📦</div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{t('echange_primaire.suppliers_recommended_title')}</h3>
              <p className="text-sm text-gray-600">
                {t('echange_secondaire.suppliers_recommended_desc')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {suppliers.filter(s => s.isApproved).map((supplier) => (
              <div key={supplier.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900">{supplier.businessName}</h4>
                    <p className="text-sm text-gray-600">{supplier.businessType}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    {t('echange_primaire.supplier_approved_badge')}
                  </span>
                </div>
                {supplier.description && (
                  <p className="text-sm text-gray-700 mb-3 line-clamp-3">
                    {supplier.description}
                  </p>
                )}
                <div className="text-sm text-gray-700 space-y-1">
                  <p>📞 {supplier.contactInfo?.phone || t('echange_primaire.phone_not_provided')}</p>
                  <p>📧 {supplier.contactInfo?.email || t('echange_primaire.email_not_provided')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gestion des fournisseurs (Admin) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-3xl">⚙️</div>
            <h3 className="text-2xl font-bold text-gray-900">{t('echange_primaire.supplier_management_title')}</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-gray-900">{supplier.businessName}</h4>
                    <p className="text-sm text-gray-600">{supplier.businessType}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    supplier.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {supplier.isApproved ? t('echange_primaire.approved_badge') : t('echange_primaire.pending_badge')}
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4 text-sm">{supplier.description}</p>
                
                <div className="mb-4">
                  <h5 className="font-semibold text-gray-900 mb-2">{t('echange_primaire.contact_colon')}</h5>
                  <p className="text-sm text-gray-600">📞 {supplier.contactInfo?.phone || t('echange_primaire.not_provided')}</p>
                  <p className="text-sm text-gray-600">📧 {supplier.contactInfo?.email || t('echange_primaire.not_provided')}</p>
                </div>
                
                {!supplier.isApproved && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveSupplier(supplier.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 text-sm font-medium"
                    >
                      {t('echange_primaire.approve_btn')}
                    </button>
                    <button
                      onClick={() => rejectSupplier(supplier.id)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 text-sm font-medium"
                    >
                      {t('echange_primaire.reject_btn')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de contact produit */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {t('echange_primaire.contact_vendor_title')}
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-gray-900 text-lg">{selectedProduct.title}</h4>
                <p className="text-sm text-gray-600">{selectedProduct.sellerName}</p>
              </div>
              <div>
                <p className="text-xl font-bold text-orange-600">
                  {selectedProduct.price.toLocaleString()} {selectedProduct.currency}
                </p>
              </div>
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">{t('echange_primaire.contact_info_label')}</h5>
                <p className="text-sm text-gray-600">
                  📞 {selectedProduct.contactInfo?.phone || t('echange_primaire.not_provided')}
                </p>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all duration-200 font-semibold"
              >
                {t('echange_primaire.call_now_btn')}
              </button>
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all duration-200 font-semibold"
              >
                ✕ {t('btn.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {products.length === 0 && (
        <div className="text-center text-gray-500 py-20">
          <div className="text-8xl mb-6">🏭</div>
          <h3 className="text-2xl font-bold mb-4">{t('echange_secondaire.no_secondary_products')}</h3>
          <p className="text-lg mb-6">{t('echange_secondaire.be_first_to_publish')}</p>
          <button
            onClick={() => setShowCreateProduct(true)}
            className="px-8 py-4 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all duration-200 font-semibold shadow-lg"
          >
            {t('echange_primaire.publish_first_product_btn')}
          </button>
        </div>
      )}
    </div>
  );
}
