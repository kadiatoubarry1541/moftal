import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/api';
import { sortAnyByProximity, getUserGeoContext, requestGPS, type UserGeoContext } from '../utils/proximity';
import { VideoRecorder } from '../components/VideoRecorder';
import { AudioRecorder } from '../components/AudioRecorder';
import { PublierAnnonceButtons } from '../components/PublierAnnonceButtons';

const API_ORIGIN = (config.API_BASE_URL || '').replace(/\/api\/?$/, '') || '';

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
  price: number;
  currency: string;
  images: string[];
  videos: string[];
  audio?: string[];
  condition: string;
  location: string;
  numeroH?: string;
  isActive: boolean;
  createdAt: string;
}

function buildImageUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

type TechTab = 'tous' | 'telephones' | 'ordinateurs' | 'tv' | 'accessoires' | 'vehicules';

const TECH_TABS: { key: TechTab; emoji: string; label: string; keywords: string[] }[] = [
  { key: 'tous',        emoji: '📦', label: 'Tous',        keywords: [] },
  { key: 'telephones',  emoji: '📱', label: 'Téléphones',  keywords: ['téléphone','telephone','smartphone','mobile','iphone','samsung','huawei','tecno','infinix','itel','xiaomi','oppo','vivo','android','sim'] },
  { key: 'ordinateurs', emoji: '💻', label: 'Ordinateurs', keywords: ['ordinateur','laptop','pc','tablette','ipad','macbook','dell','hp','lenovo','asus','acer','chromebook','desktop'] },
  { key: 'tv',          emoji: '📺', label: 'TV & Son',    keywords: ['télévision','television','tv','écran','ecran','appareil photo','caméra','camera','projecteur','hifi','sono','enceinte','home cinéma','drone'] },
  { key: 'accessoires', emoji: '🎧', label: 'Accessoires', keywords: ['écouteur','ecouteur','casque','chargeur','coque','câble','cable','batterie','powerbank','clé usb','souris','clavier','imprimante','disque dur','flash'] },
  { key: 'vehicules',   emoji: '🚗', label: 'Véhicules',   keywords: ['voiture','moto','véhicule','vehicule','scooter','vélo','velo','camion','auto','4x4','suv','berline','pick-up','taxi','pièce auto','pneu'] },
];

export default function EchangeQuaternaire() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [rawProducts, setRawProducts] = useState<ExchangeProduct[]>([]);
  const [userGeo, setUserGeo] = useState<UserGeoContext>(getUserGeoContext());
  const [gpsActive, setGpsActive] = useState(false);
  const products = useMemo(() => sortAnyByProximity(rawProducts, userGeo), [rawProducts, userGeo]);
  const [loading, setLoading] = useState(true);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ExchangeProduct | null>(null);
  const [activeTab, setActiveTab] = useState<TechTab>('tous');
  const [publishMode, setPublishMode] = useState<null | 'ecrit' | 'photo_audio' | 'video'>(null);
  const navigate = useNavigate();

  const [newProduct, setNewProduct] = useState({
    title: '',
    description: '',
    category: '',
    price: 0,
    currency: 'FG',
    condition: 'bon' as string,
    location: '',
    images: [] as File[],
    videos: [] as File[],
    photoForAudio: null as File | null,
    audio30s: null as File | null,
  });

  useEffect(() => {
    const session = localStorage.getItem('session_user');
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${config.API_BASE_URL}/exchange/quaternaire/products`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setRawProducts(data.products || []);
      } else {
        setRawProducts([]);
      }
    } catch {
      setRawProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProducts = () => {
    if (!products || !Array.isArray(products)) return [];
    if (activeTab === 'tous') return products;
    const tab = TECH_TABS.find(t => t.key === activeTab);
    if (!tab || tab.keywords.length === 0) return products;
    return products.filter(p => {
      const text = `${p.title} ${p.category} ${p.description} ${p.subcategory || ''}`.toLowerCase();
      return tab.keywords.some(k => text.includes(k));
    });
  };

  const createProduct = async () => {
    try {
      if (!newProduct.title.trim() || !newProduct.price || !newProduct.location.trim()) {
        alert('Remplissez le titre, le prix et la localisation.');
        return;
      }
      if (publishMode === 'ecrit' && newProduct.images.length === 0) {
        alert('Ajoutez au moins une photo.');
        return;
      }
      if (publishMode === 'photo_audio' && (!newProduct.photoForAudio || !newProduct.audio30s)) {
        alert('Ajoutez une photo et enregistrez un message vocal.');
        return;
      }
      if (publishMode === 'video' && newProduct.videos.length === 0) {
        alert('Enregistrez une vidéo de présentation.');
        return;
      }

      const formData = new FormData();
      formData.append('title', newProduct.title);
      formData.append('description', newProduct.description.trim() || 'Appareil numérique');
      formData.append('category', newProduct.category || 'Numérique');
      formData.append('price', newProduct.price.toString());
      formData.append('currency', newProduct.currency);
      formData.append('condition', newProduct.condition);
      formData.append('location', newProduct.location);

      newProduct.images.forEach((img, i) => formData.append(`image_${i}`, img));
      if (newProduct.photoForAudio) formData.append(`image_${newProduct.images.length}`, newProduct.photoForAudio);
      newProduct.videos.forEach((vid, i) => formData.append(`video_${i}`, vid));
      if (newProduct.audio30s) formData.append('audio_0', newProduct.audio30s);

      const token = localStorage.getItem('token');
      const res = await fetch(`${config.API_BASE_URL}/exchange/quaternaire/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        setShowCreateProduct(false);
        setPublishMode(null);
        setNewProduct({ title: '', description: '', category: '', price: 0, currency: 'FG', condition: 'bon', location: '', images: [], videos: [], photoForAudio: null, audio30s: null });
        loadData();
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403) {
          alert("⛔ " + (errData.message || "Votre compte vendeur Moftal (secteur Technologie & Véhicules) doit être approuvé par un administrateur avant de pouvoir publier."));
        } else {
          alert("Erreur lors de la publication de l'annonce : " + (errData.message || res.status));
        }
      }
    } catch {
      alert("Erreur de connexion. Vérifiez votre connexion internet et réessayez.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-gray-600 dark:text-gray-400">Chargement…</p>
        </div>
      </div>
    );
  }

  const filteredProducts = getFilteredProducts();
  const currentTab = TECH_TABS.find(t => t.key === activeTab)!;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/echange')}
        className="mb-4 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2"
      >
        ← Retour
      </button>

      {(userGeo.city || userGeo.country || gpsActive) && (
        <div className="flex items-center gap-2 text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 mb-4">
          <span>{gpsActive ? '📡' : '📍'}</span>
          <span>
            {gpsActive
              ? 'Annonces triées par distance GPS — les plus proches apparaissent en premier'
              : `Annonces de ${userGeo.city || userGeo.country} apparaissent en premier`}
          </span>
        </div>
      )}

      {/* Vendeur Officiel Moftal */}
      <div className="mb-6 rounded-2xl overflow-hidden shadow-lg border-2 border-yellow-400 dark:border-yellow-500">
        <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-2 flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <span className="text-white font-bold text-sm tracking-wide uppercase">Vendeur Officiel Moftal</span>
          <span className="ml-auto bg-white text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">OFFICIEL</span>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <span className="text-5xl">📱</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white">Appareils numériques — Téléphones, PC &amp; Accessoires</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Smartphones, ordinateurs, tablettes, TV et accessoires certifiés. Contactez-nous pour commander.
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

      {/* Header Quaternaire */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-xl p-6 mb-6 text-white shadow-lg">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="text-5xl">📱</span>
          <h1 className="text-2xl font-bold">Technologie & Véhicules</h1>
          <p className="text-violet-100 text-sm">
            Téléphones · Ordinateurs · TV · Voitures · Motos · Accessoires
          </p>
        </div>
      </div>

      {/* Onglets visuels */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Que cherches-tu ?</p>
        <div className="overflow-x-auto pb-2 -mx-1">
          <div className="flex gap-2 px-1 min-w-max">
            {TECH_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 min-w-[60px] ${
                  activeTab === tab.key
                    ? 'bg-violet-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-violet-50 hover:text-violet-700'
                }`}
              >
                <span className="text-2xl">{tab.emoji}</span>
                <span className="text-center leading-tight">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        {userData && (
          <div className="mt-3">
            <PublierAnnonceButtons
              onSelect={(mode) => { setShowCreateProduct(true); setPublishMode(mode); }}
              title="Vendre un article"
            />
          </div>
        )}
      </div>

      {/* Formulaire de publication */}
      {showCreateProduct && publishMode !== null && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => { setPublishMode(null); setShowCreateProduct(false); }}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ←
            </button>
            <span className="text-2xl">{currentTab.emoji}</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {publishMode === 'ecrit' && 'Publier par écrit (champs + photo)'}
              {publishMode === 'photo_audio' && 'Publier par photo + audio'}
              {publishMode === 'video' && 'Publier par vidéo'}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Titre de l'annonce</label>
              <input
                type="text"
                value={newProduct.title}
                onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                placeholder="Ex: Samsung Galaxy A54, MacBook Pro 2021…"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Catégorie</label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="">Choisir une catégorie</option>
                <optgroup label="📱 Téléphones">
                  <option value="Smartphone">Smartphone</option>
                  <option value="Téléphone basique">Téléphone basique</option>
                  <option value="Téléphone double SIM">Téléphone double SIM</option>
                </optgroup>
                <optgroup label="💻 Ordinateurs & Tablettes">
                  <option value="Laptop / PC portable">Laptop / PC portable</option>
                  <option value="PC de bureau">PC de bureau</option>
                  <option value="Tablette">Tablette</option>
                  <option value="Pièces & composants">Pièces &amp; composants</option>
                </optgroup>
                <optgroup label="📺 TV & Photo">
                  <option value="Télévision">Télévision</option>
                  <option value="Appareil photo">Appareil photo</option>
                  <option value="Caméra">Caméra / Dashcam</option>
                  <option value="Enceinte / Sono">Enceinte / Sono</option>
                  <option value="Projecteur">Projecteur / Vidéoprojecteur</option>
                </optgroup>
                <optgroup label="🎧 Accessoires">
                  <option value="Écouteurs / Casque">Écouteurs / Casque</option>
                  <option value="Chargeur">Chargeur / Câble</option>
                  <option value="Coque / Protection">Coque / Protection</option>
                  <option value="Batterie externe">Batterie externe / Powerbank</option>
                  <option value="Clé USB / Stockage">Clé USB / Carte mémoire</option>
                  <option value="Souris / Clavier">Souris / Clavier</option>
                  <option value="Imprimante / Scanner">Imprimante / Scanner</option>
                  <option value="Disque dur">Disque dur externe</option>
                </optgroup>
                <optgroup label="🚗 Véhicules">
                  <option value="Voiture">Voiture / Auto</option>
                  <option value="Moto">Moto / Scooter</option>
                  <option value="Vélo">Vélo</option>
                  <option value="Camion">Camion / Pickup</option>
                  <option value="Taxi">Taxi</option>
                  <option value="Pièce auto">Pièce auto / Mécanique</option>
                  <option value="Pneu">Pneu / Jante</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Prix</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newProduct.price || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) || 0 })}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="0"
                />
                <select
                  value={newProduct.currency}
                  onChange={(e) => setNewProduct({ ...newProduct, currency: e.target.value })}
                  className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  <option value="FG">FG</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">État</label>
              <select
                value={newProduct.condition}
                onChange={(e) => setNewProduct({ ...newProduct, condition: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="neuf">Neuf (jamais utilisé)</option>
                <option value="bon">Bon état</option>
                <option value="moyen">État moyen</option>
                <option value="usé">Usé / Pour pièces</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Localisation</label>
              <input
                type="text"
                value={newProduct.location}
                onChange={(e) => setNewProduct({ ...newProduct, location: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                placeholder="Ex: Conakry, Kindia, Labé…"
              />
            </div>

            {publishMode === 'photo_audio' && (
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Photo + message vocal (max 10 s)</label>
                <div className="rounded-xl border-2 border-violet-200 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/20 p-4 space-y-3">
                  <div>
                    <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Photo de l'appareil</span>
                    <input type="file" accept="image/*" capture="environment"
                      onChange={(e) => setNewProduct(prev => ({ ...prev, photoForAudio: e.target.files?.[0] || null }))}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-violet-100 file:text-violet-800 dark:file:bg-violet-900/30 dark:file:text-violet-200" />
                    {newProduct.photoForAudio && <p className="mt-1 text-xs text-green-600 dark:text-green-400">✓ Photo sélectionnée</p>}
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Message vocal (max 10 secondes)</span>
                    <AudioRecorder maxDuration={10} onAudioRecorded={(blob) => {
                      const file = new File([blob], `audio-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
                      setNewProduct(prev => ({ ...prev, audio30s: file }));
                    }} />
                    {newProduct.audio30s && <p className="mt-2 text-xs text-green-600 dark:text-green-400">✓ Audio enregistré</p>}
                  </div>
                </div>
              </div>
            )}

            {publishMode === 'video' && (
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Vidéo (max 10 secondes)</label>
                <div className="rounded-xl border-2 border-violet-200 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/20 p-4">
                  <VideoRecorder maxDuration={10} onVideoRecorded={(blob) => {
                    const file = new File([blob], `video-${Date.now()}.webm`, { type: blob.type || 'video/webm' });
                    setNewProduct(prev => ({ ...prev, videos: [file, ...prev.videos] }));
                  }} />
                  {newProduct.videos.length > 0 && <p className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">✓ Vidéo enregistrée</p>}
                </div>
              </div>
            )}

            {publishMode === 'ecrit' && (
              <>
                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">📷 Photos de l'appareil</label>
                  <input type="file" accept="image/*" multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
                      setNewProduct(p => ({ ...p, images: [...p.images, ...files] }));
                    }}
                    className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-violet-100 file:text-violet-800 dark:file:bg-violet-900/30 dark:file:text-violet-200"
                  />
                  {newProduct.images.length > 0 && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{newProduct.images.length} photo(s) ajoutée(s)</p>}
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    rows={4}
                    placeholder="Décrivez l'appareil : marque, modèle, stockage, couleur, raison de la vente…"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-4 mt-6">
            <button onClick={createProduct} className="px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 font-semibold">✅ Publier</button>
            <button onClick={() => { setShowCreateProduct(false); setPublishMode(null); }} className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 font-semibold">Annuler</button>
          </div>
        </div>
      )}

      {/* Titre section active */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-2xl">{currentTab.emoji}</span>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentTab.label}</h2>
        </div>
      </div>

      {/* Grille des annonces */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-14 bg-violet-50 dark:bg-violet-900/10 rounded-2xl border border-violet-200 dark:border-violet-800">
            <span className="text-6xl block mb-4">{currentTab.emoji}</span>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
              Aucune annonce dans <strong>{currentTab.label}</strong> pour le moment.
            </p>
            {userData && (
              <button onClick={() => { setShowCreateProduct(true); setPublishMode(null); }} className="px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700">
                ➕ Publier la première annonce
              </button>
            )}
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div key={product.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all">
              {product.images && product.images.length > 0 ? (
                <img src={buildImageUrl(product.images[0])} alt={product.title} className="w-full h-48 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : product.videos && product.videos.length > 0 ? (
                <video src={buildImageUrl(product.videos[0])} className="w-full h-48 object-cover" autoPlay muted loop playsInline
                  onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }} />
              ) : product.audio && product.audio.length > 0 ? (
                <div className="w-full h-48 bg-violet-50 dark:bg-violet-900/20 flex flex-col items-center justify-center gap-2 px-4">
                  <span className="text-4xl">🎙️</span>
                  <p className="text-xs text-violet-700 dark:text-violet-300 font-medium">Message vocal du vendeur</p>
                  <audio src={buildImageUrl(product.audio[0])} controls className="w-full" />
                </div>
              ) : (
                <div className="w-full h-48 bg-violet-50 dark:bg-violet-900/20 flex flex-col items-center justify-center gap-2">
                  <span className="text-5xl">{currentTab.emoji}</span>
                  <p className="text-xs text-gray-400">Pas encore de photo</p>
                </div>
              )}
              <div className="p-5">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug">{product.title}</h3>
                  <span className="flex-shrink-0 px-2 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-full text-xs font-semibold">
                    {product.category || 'Numérique'}
                  </span>
                </div>
                {product.condition && (
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${
                    product.condition === 'neuf' ? 'bg-green-100 text-green-700' :
                    product.condition === 'bon' ? 'bg-blue-100 text-blue-700' :
                    product.condition === 'moyen' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {product.condition === 'neuf' ? 'Neuf' : product.condition === 'bon' ? 'Bon état' : product.condition === 'moyen' ? 'État moyen' : 'Usé'}
                  </span>
                )}
                {product.description && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-3">{product.description}</p>
                )}
                <div className="mb-3 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                  <span className="text-lg font-bold text-violet-700 dark:text-violet-400">
                    {Number(product.price).toLocaleString()} {product.currency}
                  </span>
                </div>
                {product.location && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-1">
                    <span>📍</span> {product.location}
                  </p>
                )}
                <button onClick={() => setSelectedProduct(product)}
                  className="w-full py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 font-medium text-sm transition-colors">
                  📞 Contacter le vendeur
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{selectedProduct.title}</h3>
            <div className="flex gap-2 mb-3 flex-wrap">
              <span className="px-3 py-1 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-full text-xs font-semibold">
                {selectedProduct.category || 'Numérique'}
              </span>
              {selectedProduct.condition && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedProduct.condition === 'neuf' ? 'bg-green-100 text-green-700' :
                  selectedProduct.condition === 'bon' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {selectedProduct.condition === 'neuf' ? 'Neuf' : selectedProduct.condition === 'bon' ? 'Bon état' : selectedProduct.condition}
                </span>
              )}
            </div>
            {selectedProduct.description && (
              <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm">{selectedProduct.description}</p>
            )}
            <p className="text-lg font-bold text-violet-600 dark:text-violet-400 mb-2">
              {Number(selectedProduct.price).toLocaleString()} {selectedProduct.currency}
            </p>
            {selectedProduct.location && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">📍 {selectedProduct.location}</p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Pour contacter le vendeur, utilisez la messagerie interne ou les coordonnées de l'annonce.
            </p>
            <button onClick={() => setSelectedProduct(null)} className="w-full py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 font-medium">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
