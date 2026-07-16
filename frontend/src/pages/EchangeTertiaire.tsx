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

type MateriauxTab = 'tous' | 'meubles' | 'electromenager' | 'ustensiles' | 'gros_oeuvre' | 'finition' | 'plomberie' | 'electricite' | 'outils';

const MATERIAUX_TABS: { key: MateriauxTab; emoji: string; label: string; keywords: string[] }[] = [
  { key: 'tous',          emoji: '🏠', label: 'Tous',          keywords: [] },
  { key: 'meubles',       emoji: '🛋️', label: 'Meubles',       keywords: ['meuble','table','chaise','lit','armoire','canapé','canape','bureau','étagère','etagere','commode','dressing','bibliothèque'] },
  { key: 'electromenager',emoji: '❄️', label: 'Électroménager', keywords: ['réfrigérateur','refrigerateur','frigo','climatiseur','clim','machine à laver','congélateur','congelateur','four','mixeur','cuisinière','cuisiniere','ventilateur','électroménager'] },
  { key: 'ustensiles',    emoji: '🍳', label: 'Ustensiles',    keywords: ['casserole','marmite','poêle','poele','vaisselle','assiette','bol','verre','couteau','ustensile','service de table','bassine','seau','bouilloire'] },
  { key: 'gros_oeuvre',   emoji: '🧱', label: 'Gros œuvre',   keywords: ['ciment','fer','tôle','tole','bois','parpaing','béton','beton','brique','sable','gravier','acier','charpente','dalle','zinc'] },
  { key: 'finition',      emoji: '🎨', label: 'Finition',      keywords: ['carrelage','faïence','faienc','peinture','enduit','plâtre','platre','menuiserie','porte','fenêtre','fenetre','aluminium','vitrage','faux plafond','revêtement'] },
  { key: 'plomberie',     emoji: '🚿', label: 'Plomberie',     keywords: ['plomberie','tuyau','robinet','sanitaire','wc','lavabo','douche','réservoir','reservoir','forage','château d\'eau','pvc','évier'] },
  { key: 'electricite',   emoji: '⚡', label: 'Électricité',   keywords: ['câble','cable','électricité','electricite','interrupteur','prise','tableau','disjoncteur','fil','gaine','panneau solaire','onduleur','groupe électrogène'] },
  { key: 'outils',        emoji: '🔧', label: 'Outils',        keywords: ['outil','marteau','perceuse','clé','cle','vis','clou','boulon','serrure','quincaillerie','scie','tournevis','pince','niveau'] },
];

export default function EchangeTertiaire() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [rawProducts, setRawProducts] = useState<ExchangeProduct[]>([]);
  const [userGeo, setUserGeo] = useState<UserGeoContext>(getUserGeoContext());
  const [gpsActive, setGpsActive] = useState(false);
  const products = useMemo(() => sortAnyByProximity(rawProducts, userGeo), [rawProducts, userGeo]);
  const [loading, setLoading] = useState(true);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ExchangeProduct | null>(null);
  const [activeTab, setActiveTab] = useState<MateriauxTab>('tous');
  const [publishMode, setPublishMode] = useState<null | 'ecrit' | 'photo_audio' | 'video'>(null);
  const navigate = useNavigate();

  const [newProduct, setNewProduct] = useState({
    title: '',
    description: '',
    category: '',
    price: 0,
    currency: 'FG',
    condition: 'neuf' as string,
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
      const res = await fetch(`${config.API_BASE_URL}/exchange/tertiaire/products`, {
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
    const tab = MATERIAUX_TABS.find(t => t.key === activeTab);
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
      formData.append('description', newProduct.description.trim() || 'Matériaux de construction');
      formData.append('category', newProduct.category || 'Matériaux');
      formData.append('price', newProduct.price.toString());
      formData.append('currency', newProduct.currency);
      formData.append('condition', newProduct.condition);
      formData.append('location', newProduct.location);

      newProduct.images.forEach((img, i) => formData.append(`image_${i}`, img));
      if (newProduct.photoForAudio) formData.append(`image_${newProduct.images.length}`, newProduct.photoForAudio);
      newProduct.videos.forEach((vid, i) => formData.append(`video_${i}`, vid));
      if (newProduct.audio30s) formData.append('audio_0', newProduct.audio30s);

      const token = localStorage.getItem('token');
      const res = await fetch(`${config.API_BASE_URL}/exchange/tertiaire/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        setShowCreateProduct(false);
        setPublishMode(null);
        setNewProduct({ title: '', description: '', category: '', price: 0, currency: 'FG', condition: 'neuf', location: '', images: [], videos: [], photoForAudio: null, audio30s: null });
        loadData();
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403) {
          alert("⛔ " + (errData.message || "Votre compte vendeur Moftal (secteur Maison & Construction) doit être approuvé par un administrateur avant de pouvoir publier."));
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-gray-600 dark:text-gray-400">Chargement…</p>
        </div>
      </div>
    );
  }

  const filteredProducts = getFilteredProducts();
  const currentTab = MATERIAUX_TABS.find(t => t.key === activeTab)!;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/echange')}
        className="mb-4 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2"
      >
        ← Retour
      </button>

      {(userGeo.city || userGeo.country || gpsActive) && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
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
          <span className="text-5xl">🧱</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white">Matériaux de construction — Stocks disponibles</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Ciment, fer à béton, tôles, bois, carrelage. Contactez-nous pour un devis ou une commande.
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

      {/* Header Tertiaire */}
      <div className="bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl p-6 mb-6 text-white shadow-lg">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex gap-2 text-4xl">
            <span>🛋️</span><span>❄️</span><span>🧱</span><span>🔧</span>
          </div>
          <h1 className="text-2xl font-bold">Maison & Construction</h1>
          <p className="text-amber-100 text-sm">
            Meubles · Électroménager · Ustensiles · Matériaux · Outils
          </p>
        </div>
      </div>

      {/* Onglets visuels */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Que cherches-tu ?</p>
        <div className="overflow-x-auto pb-2 -mx-1">
          <div className="flex gap-2 px-1 min-w-max">
            {MATERIAUX_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 min-w-[60px] ${
                  activeTab === tab.key
                    ? 'bg-amber-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-amber-50 hover:text-amber-700'
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

      {/* Bannière immobilier */}
      <div
        onClick={() => navigate('/immobilier')}
        className="mb-6 cursor-pointer bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-700 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
      >
        <span className="text-3xl">🏘️</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-lime-800 dark:text-lime-200 text-sm">Vous cherchez un logement ?</p>
          <p className="text-xs text-lime-600 dark:text-lime-400 mt-0.5">
            Consultez nos agents immobiliers agréés → Location &amp; Vente de maisons
          </p>
        </div>
        <span className="text-lime-500 text-xl font-bold">›</span>
      </div>

      {/* Formulaire de publication */}
      {showCreateProduct && publishMode !== null && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => { setPublishMode(null); setShowCreateProduct(false); }} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">←</button>
            <span className="text-2xl">{currentTab.emoji}</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {publishMode === 'ecrit' && 'Publier par écrit (champs + photo)'}
              {publishMode === 'photo_audio' && 'Publier par photo + audio'}
              {publishMode === 'video' && 'Publier par vidéo'}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Titre</label>
              <input type="text" value={newProduct.title}
                onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Ex: Ciment Portland 50kg, Fer à béton 12mm…" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Catégorie</label>
              <select value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                <option value="">Choisir une catégorie</option>
                <optgroup label="🧱 Gros œuvre">
                  <option value="Ciment">Ciment</option>
                  <option value="Fer à béton">Fer à béton</option>
                  <option value="Tôle">Tôle ondulée / Tôle plate</option>
                  <option value="Bois / Planches">Bois / Planches</option>
                  <option value="Parpaing / Brique">Parpaing / Brique</option>
                  <option value="Sable / Gravier">Sable / Gravier</option>
                  <option value="Acier / Charpente">Acier / Charpente métallique</option>
                </optgroup>
                <optgroup label="🎨 Finition">
                  <option value="Carrelage / Faïence">Carrelage / Faïence</option>
                  <option value="Peinture / Enduit">Peinture / Enduit</option>
                  <option value="Porte / Fenêtre">Porte / Fenêtre</option>
                  <option value="Menuiserie aluminium">Menuiserie aluminium</option>
                  <option value="Faux plafond">Faux plafond</option>
                </optgroup>
                <optgroup label="🚿 Plomberie">
                  <option value="Tuyaux PVC">Tuyaux PVC</option>
                  <option value="Robinetterie">Robinetterie / Sanitaires</option>
                  <option value="Pompe à eau">Pompe à eau</option>
                  <option value="Château d'eau">Château d'eau / Réservoir</option>
                </optgroup>
                <optgroup label="⚡ Électricité">
                  <option value="Câbles électriques">Câbles électriques</option>
                  <option value="Panneau solaire">Panneau solaire / Onduleur</option>
                  <option value="Tableau électrique">Tableau / Disjoncteur</option>
                  <option value="Prises / Interrupteurs">Prises / Interrupteurs</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Prix</label>
              <div className="flex gap-2">
                <input type="number" value={newProduct.price || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) || 0 })}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="0" />
                <select value={newProduct.currency}
                  onChange={(e) => setNewProduct({ ...newProduct, currency: e.target.value })}
                  className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                  <option value="FG">FG</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Localisation</label>
              <input type="text" value={newProduct.location}
                onChange={(e) => setNewProduct({ ...newProduct, location: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Ex: Conakry, Kindia…" />
            </div>

            {publishMode === 'photo_audio' && (
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Photo + message vocal (max 10 s)</label>
                <div className="rounded-xl border-2 border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20 p-4 space-y-3">
                  <div>
                    <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Photo du matériau</span>
                    <input type="file" accept="image/*" capture="environment"
                      onChange={(e) => setNewProduct(prev => ({ ...prev, photoForAudio: e.target.files?.[0] || null }))}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-800 dark:file:bg-amber-900/30 dark:file:text-amber-200" />
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
                <div className="rounded-xl border-2 border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20 p-4">
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
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">📷 Photos</label>
                  <input type="file" accept="image/*" multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
                      setNewProduct(p => ({ ...p, images: [...p.images, ...files] }));
                    }}
                    className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-800 dark:file:bg-amber-900/30 dark:file:text-amber-200" />
                  {newProduct.images.length > 0 && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{newProduct.images.length} photo(s)</p>}
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    rows={4} placeholder="Décrivez vos matériaux (quantité, qualité, origine…)" />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-4 mt-6">
            <button onClick={createProduct} className="px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-semibold">✅ Publier</button>
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
          <div className="col-span-full text-center py-14 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800">
            <span className="text-6xl block mb-4">{currentTab.emoji}</span>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
              Aucune annonce dans <strong>{currentTab.label}</strong> pour le moment.
            </p>
            {userData && (
              <button onClick={() => { setShowCreateProduct(true); setPublishMode(null); }} className="px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700">
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
                <div className="w-full h-48 bg-amber-50 dark:bg-amber-900/20 flex flex-col items-center justify-center gap-2 px-4">
                  <span className="text-4xl">🎙️</span>
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Message vocal du vendeur</p>
                  <audio src={buildImageUrl(product.audio[0])} controls className="w-full" />
                </div>
              ) : (
                <div className="w-full h-48 bg-amber-50 dark:bg-amber-900/20 flex flex-col items-center justify-center gap-2">
                  <span className="text-5xl">{currentTab.emoji}</span>
                  <p className="text-xs text-gray-400">Pas encore de photo</p>
                </div>
              )}
              <div className="p-5">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug">{product.title}</h3>
                  <span className="flex-shrink-0 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold">
                    {product.category || 'Matériaux'}
                  </span>
                </div>
                {product.description && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-3">{product.description}</p>
                )}
                <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                    {Number(product.price).toLocaleString()} {product.currency}
                  </span>
                </div>
                {product.location && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-1">
                    <span>📍</span> {product.location}
                  </p>
                )}
                <button onClick={() => setSelectedProduct(product)}
                  className="w-full py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-medium text-sm transition-colors">
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
            <span className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold mb-3">
              {selectedProduct.category || 'Matériaux'}
            </span>
            {selectedProduct.description && (
              <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm">{selectedProduct.description}</p>
            )}
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-2">
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
