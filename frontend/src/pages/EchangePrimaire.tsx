import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/api';
import { sortAnyByProximity, anyProximityLabel, getUserGeoContext, requestGPS, type UserGeoContext } from '../utils/proximity';
import { VideoRecorder } from '../components/VideoRecorder';
import { AudioRecorder } from '../components/AudioRecorder';
import { PublierAnnonceButtons } from '../components/PublierAnnonceButtons';

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
  level: 'primaire';
  price: number;
  currency: string;
  images: string[];
  videos: string[];
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

const PRIMAIRE_TABS = [
  { key: 'tous',     emoji: '🛍️', label: 'Tous',     keywords: [] },
  { key: 'cereales', emoji: '🌾', label: 'Céréales', keywords: ['riz','maïs','mais','mil','manioc','sorgho','fonio','farine','blé','ble','igname','céréale','patate'] },
  { key: 'legumes',  emoji: '🥬', label: 'Légumes',  keywords: ['tomate','oignon','piment','gombo','aubergine','légume','legume','carotte','chou','haricot','concombre','ciboulette','épinard'] },
  { key: 'fruits',   emoji: '🍌', label: 'Fruits',   keywords: ['mangue','orange','banane','papaye','ananas','citron','fruit','avocat','goyave','noix','coco','pastèque'] },
  { key: 'animaux',  emoji: '🐓', label: 'Animaux',  keywords: ['bœuf','boeuf','mouton','chèvre','chevre','poulet','pintade','lapin','porc','vache','agneau','volaille','bétail','betail','dinde','canard','oie'] },
  { key: 'poissons', emoji: '🐟', label: 'Poissons', keywords: ['poisson','crevette','tilapia','capitaine','mulet','silure','carpe','maquereau','sardine','thon','mer','fruits de mer'] },
  { key: 'plantes',  emoji: '🌿', label: 'Plantes',  keywords: ['plante','herbe','médicinal','medicinal','racine','écorce','feuille','gingembre','ail','persil','basilic','menthe','kinkeliba'] },
  { key: 'huiles',   emoji: '🫙', label: 'Huiles',   keywords: ['huile','palme','arachide','sésame','sesame','sel','épice','epice','condiment','soumbara','piment sec','cube maggi','lait'] },
] as const;

export default function EchangePrimaire() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [rawProducts, setRawProducts] = useState<ExchangeProduct[]>([]);
  const [rawSuppliers, setRawSuppliers] = useState<Supplier[]>([]);
  const [userGeo, setUserGeo] = useState<UserGeoContext>(getUserGeoContext());
  const [gpsActive, setGpsActive] = useState(false);
  const products = useMemo(() => sortAnyByProximity(rawProducts, userGeo), [rawProducts, userGeo]);
  const suppliers = useMemo(() => sortAnyByProximity(rawSuppliers, userGeo), [rawSuppliers, userGeo]);
  const [loading, setLoading] = useState(true);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showSupplierRegistration, setShowSupplierRegistration] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ExchangeProduct | null>(null);
  const [selectedSupplier] = useState<Supplier | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'tous'|'cereales'|'legumes'|'fruits'|'animaux'|'poissons'|'plantes'|'huiles'>('tous');
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
      
      // Charger les produits primaires
      const productsEndpoint = `${config.API_BASE_URL}/exchange/primaire/products`;
      const productsResponse = await fetch(productsEndpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        const geo = getUserGeoContext();
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
      title: 'Riz Local Premium',
      description: 'Riz de qualité supérieure cultivé localement, idéal pour la consommation familiale.',
      category: 'Alimentation',
      level: 'primaire',
      price: 15000,
      currency: 'FG',
      images: [],
      videos: [],
      condition: 'neuf',
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
      title: 'Huile de Palme Artisanale',
      description: 'Huile de palme extraite artisanalement, sans conservateurs chimiques.',
      category: 'Alimentation',
      level: 'primaire',
      price: 8000,
      currency: 'FG',
      images: [],
      videos: [],
      condition: 'neuf',
      location: 'Kindia',
      seller: 'G0C0P0R0E0F0 0',
      sellerName: 'Producteur Local',
      contactInfo: { phone: '+224 987 654 321' },
      isActive: true,
      isApproved: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      title: 'Coton Biologique',
      description: 'Coton cultivé sans pesticides, parfait pour la confection de vêtements.',
      category: 'Textile',
      level: 'primaire',
      price: 25000,
      currency: 'FG',
      images: [],
      videos: [],
      condition: 'bon',
      location: 'Faranah',
      seller: 'G0C0P0R0E0F0 0',
      sellerName: 'Coopérative Agricole',
      contactInfo: { phone: '+224 555 123 456' },
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
        alert("Ajoutez une photo et enregistrez un message vocal.");
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

      newProduct.images.forEach((img, i) => formData.append(`image_${i}`, img));
      if (newProduct.photoForAudio) formData.append(`image_${newProduct.images.length}`, newProduct.photoForAudio);
      newProduct.videos.forEach((vid, i) => formData.append(`video_${i}`, vid));
      if (newProduct.audio30s) formData.append('audio_0', newProduct.audio30s);

      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/exchange/primaire/products`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        alert('Produit publié avec succès !');
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
          images: [] as File[],
          videos: [] as File[],
          photoForAudio: null,
          audio30s: null
        });
        loadData();
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403) {
          alert("⛔ " + (errData.message || "Votre compte vendeur Moftal (secteur Alimentation & Vivant) doit être approuvé par un administrateur avant de pouvoir publier."));
        } else {
          alert("Erreur lors de la publication du produit : " + (errData.message || res.status));
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

  // Fonction pour filtrer les produits selon l'onglet actif
  const getFilteredProducts = () => {
    if (!products || !Array.isArray(products)) return [];
    if (activeSubTab === 'tous') return products;
    const tab = PRIMAIRE_TABS.find(t => t.key === activeSubTab);
    if (!tab || tab.keywords.length === 0) return products;
    return products.filter(p => {
      if (!p) return false;
      const text = `${p.title} ${p.category} ${p.description}`.toLowerCase();
      return (tab.keywords as readonly string[]).some(k => text.includes(k));
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Chargement des produits primaires...</div>
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
        ← Retour
      </button>

      {/* Bannière proximité */}
      {(userGeo.city || userGeo.country || gpsActive) && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-4">
          <span className="text-base">{gpsActive ? "📡" : "📍"}</span>
          <span>{gpsActive ? "Annonces triées par distance GPS — les plus proches apparaissent en premier" : `Annonces de ${userGeo.city || userGeo.country} apparaissent en premier`}</span>
        </div>
      )}

      {/* ── Vendeur Officiel Moftal ── */}
      <div className="mb-6 rounded-2xl overflow-hidden shadow-lg border-2 border-yellow-400 dark:border-yellow-500">
        <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-2 flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <span className="text-white font-bold text-sm tracking-wide uppercase">Vendeur Officiel Moftal</span>
          <span className="ml-auto bg-white text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">OFFICIEL</span>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <span className="text-5xl">🌾</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white">Alimentation — Produits certifiés</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Riz, huiles, légumes, produits locaux. Contactez-nous directement pour passer commande.
            </p>
          </div>
          <a
            href="mailto:lontal.profestionnelles@gmail.com"
            className="flex-shrink-0 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Nous contacter
          </a>
        </div>
      </div>

      {/* Bannière en-tête Primaire */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 mb-6 text-white shadow-lg">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="text-5xl">🌾</span>
          <h1 className="text-2xl font-bold">Secteur Primaire</h1>
          <p className="text-green-100 text-sm">Aliments et restauration</p>
        </div>
      </div>

      {/* Navigation sous-catégories visuelles */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Que cherches-tu ?</p>
        <div className="overflow-x-auto pb-2 -mx-1">
          <div className="flex gap-2 px-1 min-w-max">
            {PRIMAIRE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key as any)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 min-w-[60px] ${
                  activeSubTab === tab.key
                    ? 'bg-green-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                <span className="text-2xl">{tab.emoji}</span>
                <span className="text-center leading-tight">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            {PRIMAIRE_TABS.find(t => t.key === activeSubTab)?.key === 'tous'
              ? 'Tous les produits alimentaires'
              : `Produits : ${PRIMAIRE_TABS.find(t => t.key === activeSubTab)?.label}`}
          </p>
          <button
            onClick={() => navigate('/echange/nourriture')}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600"
          >
            <span>🍽️</span>
            <span>Restaurants</span>
          </button>
        </div>
      </div>

      {/* Barre compacte */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">🍚 Aliments</h2>
        </div>
        <div className="flex items-center gap-2">
          <PublierAnnonceButtons onSelect={(mode) => { setShowCreateProduct(true); setPublishMode(mode); }} />
          {isAdmin && (
            <button onClick={() => setSelectedSupplier({} as Supplier)}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold">
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* Formulaire de création de produit */}
      {showCreateProduct && publishMode !== null && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => { setPublishMode(null); setShowCreateProduct(false); }} className="text-gray-500 hover:text-gray-700">←</button>
            <div className="text-3xl">📦</div>
            <h3 className="text-2xl font-bold text-gray-900">
              {publishMode === 'ecrit' && 'Publier par écrit (champs + photo)'}
              {publishMode === 'photo_audio' && 'Publier par photo + audio'}
              {publishMode === 'video' && 'Publier par vidéo'}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Champs texte : écrit seulement ── */}
            {publishMode === 'ecrit' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Titre du produit</label>
                  <input type="text" value={newProduct.title} onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ex: Riz Local Premium" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Catégorie</label>
                  <select value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500">
                    <option value="">Sélectionner une catégorie</option>
                    <option value="Alimentation">Alimentation</option>
                    <option value="Aliments">Aliments</option>
                    <option value="Textile">Textile</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Artisanat">Artisanat</option>
                    <option value="Matières Premières">Matières Premières</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Prix</label>
                  <div className="flex gap-2">
                    <input type="number" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500" placeholder="15000" />
                    <select value={newProduct.currency} onChange={(e) => setNewProduct({...newProduct, currency: e.target.value})}
                      className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500">
                      <option value="FG">FG</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">État</label>
                  <select value={newProduct.condition} onChange={(e) => setNewProduct({...newProduct, condition: e.target.value as any})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500">
                    <option value="neuf">Neuf</option>
                    <option value="bon">Bon état</option>
                    <option value="moyen">État moyen</option>
                    <option value="usé">Usé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Localisation</label>
                  <input type="text" value={newProduct.location} onChange={(e) => setNewProduct({...newProduct, location: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ex: Ville Principale" />
                </div>
              </>
            )}

            {publishMode === 'photo_audio' && (
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Photo + message vocal (max 1 min)</label>
              <p className="text-xs text-gray-500 mb-2">Prenez une photo de votre produit et enregistrez un message vocal pour le présenter.</p>
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <div>
                  <span className="block text-xs font-medium text-gray-600 mb-1">Photo du produit</span>
                  <input type="file" accept="image/*" capture="environment"
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, photoForAudio: e.target.files?.[0] || null }))}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-800"
                  />
                  {newProduct.photoForAudio && <p className="mt-1 text-xs text-green-600">✓ Photo sélectionnée</p>}
                </div>
                <div>
                  <span className="block text-xs font-medium text-gray-600 mb-1">Message vocal (max 10 secondes)</span>
                  <AudioRecorder maxDuration={10} onAudioRecorded={(blob) => setNewProduct((prev) => ({ ...prev, audio30s: new File([blob], `audio-${Date.now()}.webm`, { type: blob.type || 'audio/webm' }) }))} />
                  {newProduct.audio30s && <p className="mt-2 text-xs text-green-600">✓ Audio enregistré</p>}
                </div>
              </div>
            </div>
            )}
            {publishMode === 'video' && (
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Vidéo (max 10 secondes)</label>
              <p className="text-xs text-gray-500 mb-2">Enregistrez une courte vidéo de 5 à 10 secondes pour présenter votre produit.</p>
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4">
                <VideoRecorder maxDuration={10} onVideoRecorded={(blob) => {
                  const file = new File([blob], `video-${Date.now()}.webm`, { type: blob.type || 'video/webm' });
                  setNewProduct((prev) => ({ ...prev, videos: [file, ...prev.videos] }));
                }} />
                {newProduct.videos.length > 0 && <p className="mt-2 text-sm text-green-600 font-medium">✓ Vidéo enregistrée</p>}
              </div>
            </div>
            )}
            {publishMode === 'ecrit' && (
            <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">📷 Photos</label>
              <div className="space-y-3">
                <input type="file" id="media-capture-primaire" accept="image/*" capture="environment" multiple className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
                    setNewProduct(p => ({ ...p, images: [...p.images, ...files] }));
                  }}
                />
                <input type="file" id="media-gallery-primaire" accept="image/*" multiple className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
                    setNewProduct(p => ({ ...p, images: [...p.images, ...files] }));
                  }}
                />
                <div className="flex gap-3">
                  <label htmlFor="media-capture-primaire" className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 cursor-pointer text-center font-medium">
                    📷 Prendre une photo
                  </label>
                  <label htmlFor="media-gallery-primaire" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer text-center font-medium">
                    🖼️ Choisir depuis galerie
                  </label>
                </div>
                {newProduct.images.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-green-600 font-medium mb-3">✅ {newProduct.images.length} photo(s)</p>
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
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Description</label>
              <textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
                rows={4}
                placeholder="Décrivez votre produit en détail..."
              />
            </div>
            </>
            )}
          </div>
          
          <div className="flex gap-4 mt-8">
            <button
              onClick={createProduct}
              className="px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              ✅ Publier le Produit
            </button>
            <button
              onClick={() => { setShowCreateProduct(false); setPublishMode(null); }}
              className="px-8 py-4 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all duration-200 font-semibold"
            >
              ❌ Annuler
            </button>
          </div>
        </div>
      )}

      {/* Formulaire d'inscription fournisseur */}
      {showSupplierRegistration && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-3xl">🏢</div>
            <h3 className="text-2xl font-bold text-gray-900">Devenir fournisseur</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Nom de l'entreprise</label>
              <input
                type="text"
                value={newSupplier.businessName}
                onChange={(e) => setNewSupplier({...newSupplier, businessName: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder="Ex: Coopérative Agricole ABC"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Type d'entreprise</label>
              <select
                value={newSupplier.businessType}
                onChange={(e) => setNewSupplier({...newSupplier, businessType: e.target.value as any})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              >
                <option value="individuel">Individuel</option>
                <option value="entreprise">Entreprise</option>
                <option value="coopérative">Coopérative</option>
                <option value="association">Association</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Téléphone</label>
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
              <label className="block text-sm font-semibold text-gray-700 mb-3">Email</label>
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
              <label className="block text-sm font-semibold text-gray-700 mb-3">Ville</label>
              <input
                type="text"
                value={newSupplier.address.city}
                onChange={(e) => setNewSupplier({
                  ...newSupplier, 
                  address: {...newSupplier.address, city: e.target.value}
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder="Ville Principale"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Région</label>
              <select
                value={newSupplier.address.region}
                onChange={(e) => setNewSupplier({
                  ...newSupplier, 
                  address: {...newSupplier.address, region: e.target.value}
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              >
                <option value="">Sélectionner une région</option>
                <option value="Zone Côtière">Zone Côtière</option>
                <option value="Zone Montagneuse">Zone Montagneuse</option>
                <option value="Zone Agricole">Zone Agricole</option>
                <option value="Zone Forestière">Zone Forestière</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Description de l'activité</label>
              <textarea
                value={newSupplier.description}
                onChange={(e) => setNewSupplier({...newSupplier, description: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                rows={4}
                placeholder="Décrivez votre activité commerciale..."
              />
            </div>
          </div>
          
          <div className="flex gap-4 mt-8">
            <button
              onClick={registerSupplier}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              📝 Envoyer la Demande
            </button>
            <button
              onClick={() => setShowSupplierRegistration(false)}
              className="px-8 py-4 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all duration-200 font-semibold"
            >
              ❌ Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des produits filtrés - Section distincte */}
      <div className="mb-8 rounded-2xl shadow-lg border-2 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2 text-green-800">
            {PRIMAIRE_TABS.find(t => t.key === activeSubTab)?.emoji} {PRIMAIRE_TABS.find(t => t.key === activeSubTab)?.label}
          </h2>
          <p className="text-sm text-green-600">
            {getFilteredProducts().length} produit{getFilteredProducts().length !== 1 ? 's' : ''} disponible{getFilteredProducts().length !== 1 ? 's' : ''}
          </p>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {getFilteredProducts().length === 0 ? (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-600 text-lg">Aucun produit dans cette catégorie pour le moment.</p>
              <button
                onClick={() => setShowCreateProduct(true)}
                className="mt-4 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200"
              >
                ➕ Publier le premier produit
              </button>
            </div>
          ) : (
            getFilteredProducts().map((product) => (
          <div key={product.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-green-100 hover:border-green-300">
            {/* Image ou vidéo ou audio */}
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
            ) : (product as any).audio && (product as any).audio.length > 0 ? (
              <div className="w-full h-48 bg-amber-50 flex flex-col items-center justify-center gap-2 px-4">
                <span className="text-4xl">🎙️</span>
                <p className="text-xs text-amber-700 font-medium text-center">Message vocal du vendeur</p>
                <audio src={buildImageUrl((product as any).audio[0])} controls className="w-full" />
              </div>
            ) : (
              <div className="w-full h-48 bg-green-50 flex flex-col items-center justify-center gap-2">
                <span className="text-5xl">📷</span>
                <p className="text-xs text-gray-400">Pas encore de photo</p>
              </div>
            )}
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base mb-1">{product.title}</h3>
                  <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                    {product.category}
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
              <div className="mb-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-3 text-white">
                <div className="text-xl font-black">{product.price.toLocaleString()} {product.currency}</div>
              </div>
              <div className="text-sm text-gray-600 mb-3 flex items-center gap-1">
                <span>📍</span><span>{product.location}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedProduct(product)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-bold"
                >
                  📞 Contacter
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
              <h3 className="text-2xl font-bold text-gray-900">Fournisseurs recommandés</h3>
              <p className="text-sm text-gray-600">
                Liste des fournisseurs approuvés pour vous approvisionner en produits primaires.
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
                    ✅ Fournisseur approuvé
                  </span>
                </div>
                {supplier.description && (
                  <p className="text-sm text-gray-700 mb-3 line-clamp-3">
                    {supplier.description}
                  </p>
                )}
                <div className="text-sm text-gray-700 space-y-1">
                  <p>📞 {supplier.contactInfo?.phone || "Téléphone non renseigné"}</p>
                  <p>📧 {supplier.contactInfo?.email || "Email non renseigné"}</p>
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
            <h3 className="text-2xl font-bold text-gray-900">Gestion des Fournisseurs</h3>
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
                    {supplier.isApproved ? '✅ Approuvé' : '⏳ En attente'}
                  </div>
                </div>
                
                <div className="mb-4">
                  <h5 className="font-semibold text-gray-900 mb-2">Contact :</h5>
                  <p className="text-sm text-gray-600">📞 {supplier.contactInfo?.phone || 'Non renseigné'}</p>
                  <p className="text-sm text-gray-600">📧 {supplier.contactInfo?.email || 'Non renseigné'}</p>
                </div>
                
                {!supplier.isApproved && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveSupplier(supplier.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 text-sm font-medium"
                    >
                      ✅ Approuver
                    </button>
                    <button
                      onClick={() => rejectSupplier(supplier.id)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 text-sm font-medium"
                    >
                      ❌ Rejeter
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
              Contacter le vendeur
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-gray-900 text-lg">{selectedProduct.title}</h4>
                <p className="text-sm text-gray-600">{selectedProduct.sellerName}</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-600">
                  {selectedProduct.price.toLocaleString()} {selectedProduct.currency}
                </p>
              </div>
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">Informations de contact :</h5>
                <p className="text-sm text-gray-600">
                  📞 {selectedProduct.contactInfo?.phone || 'Non renseigné'}
                </p>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 font-semibold"
              >
                📞 Appeler maintenant
              </button>
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all duration-200 font-semibold"
              >
                ✕ Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {products.length === 0 && (
        <div className="text-center text-gray-500 py-20">
          <div className="text-8xl mb-6">🛍️</div>
          <h3 className="text-2xl font-bold mb-4">Aucun produit primaire</h3>
          <button
            onClick={() => setShowCreateProduct(true)}
            className="px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 font-semibold shadow-lg"
          >
            ➕ Publier le premier produit
          </button>
        </div>
      )}


    </div>
  );
}
