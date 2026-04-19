import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/api';
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

export const SUBTYPE_MAISONS = 'Maison à louer';
export const SUBTYPE_MATERIAUX = 'Matériaux de construction';

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

export default function EchangeTertiaire() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [products, setProducts] = useState<ExchangeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ExchangeProduct | null>(null);
  const [activeTab, setActiveTab] = useState<'maisons' | 'materiaux'>('maisons');
  const [publishMode, setPublishMode] = useState<null | 'ecrit' | 'photo_audio' | 'video'>(null);
  const navigate = useNavigate();

  const [newProduct, setNewProduct] = useState({
    title: '',
    description: '',
    subcategory: SUBTYPE_MAISONS as string,
    price: 0,
    currency: 'FG',
    condition: 'bon' as string,
    location: '',
    images: [] as File[],
    videos: [] as File[],
    photoForAudio: null as File | null,
    audio30s: null as File | null
  });

  useEffect(() => {
    // Charger les produits même sans connexion (vitrine publique)
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

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${config.API_BASE_URL}/exchange/tertiaire/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      } else {
        setProducts([]);
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProducts = (): ExchangeProduct[] => {
    if (!products?.length) return [];
    if (activeTab === 'maisons') {
      return products.filter(
        (p) =>
          (p.subcategory || '').trim() === SUBTYPE_MAISONS ||
          (p.subcategory || '').toLowerCase().includes('maison') ||
          (p.subcategory || '').toLowerCase().includes('louer')
      );
    }
    return products.filter(
      (p) =>
        (p.subcategory || '').trim() === SUBTYPE_MATERIAUX ||
        (p.subcategory || '').toLowerCase().includes('matériaux') ||
        (p.subcategory || '').toLowerCase().includes('materiaux') ||
        (p.subcategory || '').toLowerCase().includes('construction')
    );
  };

  const createProduct = async () => {
    try {
      if (!newProduct.title.trim() || !newProduct.subcategory || !newProduct.price || !newProduct.location.trim()) {
        alert("Remplissez le titre, le type, le prix et la localisation.");
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
      formData.append('category', newProduct.subcategory);
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
        body: formData
      });

      if (res.ok) {
        setShowCreateProduct(false);
        setPublishMode(null);
        setNewProduct({
          title: '',
          description: '',
          subcategory: SUBTYPE_MAISONS,
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
        alert('Erreur lors de la création de l\'annonce');
      }
    } catch {
      alert('Erreur lors de la création de l\'annonce');
    }
  };

  const filtered = getFilteredProducts();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-gray-600 dark:text-gray-400">Chargement du tertiaire…</p>
        </div>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/echange')}
        className="mb-4 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2"
      >
        ← Retour
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveTab('maisons')}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'maisons'
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>🏠</span>
              <span>Maisons à louer</span>
            </button>
            <button
              onClick={() => setActiveTab('materiaux')}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'materiaux'
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>🧱</span>
              <span>Matériaux de construction</span>
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <PublierAnnonceButtons
              onSelect={(mode) => { setShowCreateProduct(true); setPublishMode(mode); }}
              title="Publier une annonce"
            />
          </div>
        </div>
      </div>

      {showCreateProduct && publishMode !== null && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => { setPublishMode(null); setShowCreateProduct(false); }} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">←</button>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {publishMode === 'ecrit' && 'Publier par écrit (champs + photo)'}
              {publishMode === 'photo_audio' && 'Publier par photo + audio'}
              {publishMode === 'video' && 'Publier par vidéo'}
            </h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Type</label>
              <select
                value={newProduct.subcategory}
                onChange={(e) => setNewProduct({ ...newProduct, subcategory: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value={SUBTYPE_MAISONS}>Maison à louer</option>
                <option value={SUBTYPE_MATERIAUX}>Matériaux de construction</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Titre</label>
              <input
                type="text"
                value={newProduct.title}
                onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder={
                  newProduct.subcategory === SUBTYPE_MAISONS
                    ? 'Ex: Appartement 3 pièces, centre-ville'
                    : 'Ex: Ciment, Fer à béton, Tôles'
                }
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Prix</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newProduct.price || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) || 0 })}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="0"
                />
                <select
                  value={newProduct.currency}
                  onChange={(e) => setNewProduct({ ...newProduct, currency: e.target.value })}
                  className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="FG">FG</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Localisation</label>
              <input
                type="text"
                value={newProduct.location}
                onChange={(e) => setNewProduct({ ...newProduct, location: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Ex: Conakry, Kindia"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">État / Type</label>
              <select
                value={newProduct.condition}
                onChange={(e) => setNewProduct({ ...newProduct, condition: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="neuf">Neuf</option>
                <option value="bon">Bon état</option>
                <option value="moyen">Moyen</option>
                <option value="usé">Usé</option>
              </select>
            </div>
            {publishMode === 'photo_audio' && (
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Photo + message vocal (max 1 min)</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Prenez une photo de votre bien et enregistrez un message vocal (max 1 min) pour le présenter.</p>
              <div className="rounded-xl border-2 border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20 p-4 space-y-3">
                <div>
                  <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Photo du bien</span>
                  <input type="file" accept="image/*" capture="environment"
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, photoForAudio: e.target.files?.[0] || null }))}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-800 dark:file:bg-amber-900/30 dark:file:text-amber-200"
                  />
                  {newProduct.photoForAudio && <p className="mt-1 text-xs text-green-600 dark:text-green-400">✓ Photo sélectionnée</p>}
                </div>
                <div>
                  <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Audio de présentation (30 s)</span>
                  <AudioRecorder maxDuration={30} onAudioRecorded={(blob) => {
                    const file = new File([blob], `audio-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
                    setNewProduct((prev) => ({ ...prev, audio30s: file }));
                  }} />
                  {newProduct.audio30s && <p className="mt-2 text-xs text-green-600 dark:text-green-400">✓ Audio enregistré</p>}
                </div>
              </div>
            </div>
            )}
            {publishMode === 'video' && (
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Vidéo (max 1 min)</label>
              <div className="rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20 p-4">
                <VideoRecorder maxDuration={60} onVideoRecorded={(blob) => {
                  const file = new File([blob], `video-${Date.now()}.webm`, { type: blob.type || 'video/webm' });
                  setNewProduct((prev) => ({ ...prev, videos: [file, ...prev.videos] }));
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
                className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-100 file:text-green-800 dark:file:bg-green-900/30 dark:file:text-green-200"
              />
              {newProduct.images.length > 0 && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">{newProduct.images.length} photo(s)</p>
              )}
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
              <textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                rows={4}
                placeholder="Décrivez votre bien ou les matériaux..."
              />
            </div>
            </>
            )}
          </div>
          <div className="flex gap-4 mt-6">
            <button
              onClick={createProduct}
              className="px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-semibold"
            >
              ✅ Publier
            </button>
            <button
              onClick={() => setShowCreateProduct(false)}
              className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {activeTab === 'maisons'
                ? 'Aucune maison à louer pour le moment.'
                : 'Aucun matériau de construction pour le moment.'}
            </p>
            <button
              onClick={() => { setShowCreateProduct(true); setPublishMode(null); }}
              className="mt-4 px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700"
            >
              ➕ Publier la première annonce
            </button>
          </div>
        ) : (
          filtered.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{product.title}</h3>
                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded-full text-xs font-medium">
                  {product.subcategory || 'Tertiaire'}
                </span>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4">{product.description}</p>
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
                  {Number(product.price).toLocaleString()} {product.currency}
                </span>
              </div>
              {product.location && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1">
                  <span>📍</span> {product.location}
                </p>
              )}
              <button
                onClick={() => setSelectedProduct(product)}
                className="w-full py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-medium"
              >
                Contacter
              </button>
            </div>
          ))
        )}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProduct(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{selectedProduct.title}</h3>
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">{selectedProduct.subcategory}</p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{selectedProduct.description}</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-2">
              {Number(selectedProduct.price).toLocaleString()} {selectedProduct.currency}
            </p>
            {selectedProduct.location && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">📍 {selectedProduct.location}</p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Pour contacter le vendeur, utilisez la messagerie ou les coordonnées affichées sur l'annonce.
            </p>
            <button
              onClick={() => setSelectedProduct(null)}
              className="w-full py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
