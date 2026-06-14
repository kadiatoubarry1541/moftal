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
  const [rawProducts, setRawProducts] = useState<ExchangeProduct[]>([]);
  const [userGeo, setUserGeo] = useState<UserGeoContext>(getUserGeoContext());
  const [gpsActive, setGpsActive] = useState(false);
  const products = useMemo(() => sortAnyByProximity(rawProducts, userGeo), [rawProducts, userGeo]);
  const [loading, setLoading] = useState(true);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ExchangeProduct | null>(null);
  const [publishMode, setPublishMode] = useState<null | 'ecrit' | 'photo_audio' | 'video'>(null);
  const navigate = useNavigate();

  const [newProduct, setNewProduct] = useState({
    title: '',
    description: '',
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
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const all: ExchangeProduct[] = data.products || [];
        setRawProducts(all.filter(p =>
          !p.subcategory ||
          p.subcategory.toLowerCase().includes('matériaux') ||
          p.subcategory.toLowerCase().includes('materiaux') ||
          p.subcategory.toLowerCase().includes('construction')
        ));
      } else {
        setRawProducts([]);
      }
    } catch {
      setRawProducts([]);
    } finally {
      setLoading(false);
    }
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
      formData.append('category', 'Matériaux de construction');
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
        setNewProduct({ title: '', description: '', price: 0, currency: 'FG', condition: 'bon', location: '', images: [], videos: [], photoForAudio: null, audio30s: null });
        loadData();
      } else {
        alert("Erreur lors de la publication de l'annonce");
      }
    } catch {
      alert("Erreur lors de la publication de l'annonce");
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/echange')}
        className="mb-4 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2"
      >
        ← Retour
      </button>

      {(userGeo.city || userGeo.country || gpsActive) && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-4">
          <span className="text-base">{gpsActive ? '📡' : '📍'}</span>
          <span>
            {gpsActive
              ? 'Annonces triées par distance GPS — les plus proches apparaissent en premier'
              : `Annonces de ${userGeo.city || userGeo.country} apparaissent en premier`}
          </span>
        </div>
      )}

      {/* ── Vendeur Officiel Moftal ── */}
      <div className="mb-4 rounded-2xl overflow-hidden shadow-lg border-2 border-yellow-400 dark:border-yellow-500">
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
              Ciment, fer, tôles, bois et matériaux de qualité. Contactez-nous pour un devis ou une commande.
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

      {/* Header matériaux */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-5 mb-4 flex flex-wrap items-center gap-4">
        <span className="text-4xl">🧱</span>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-amber-900 dark:text-amber-100">Matériaux de construction</h1>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
            Achetez et vendez ciment, fer, tôles, bois et autres matériaux
          </p>
        </div>
        {userData && (
          <PublierAnnonceButtons
            onSelect={(mode) => { setShowCreateProduct(true); setPublishMode(mode); }}
            title="Publier une annonce"
          />
        )}
      </div>

      {/* Bannière Immobilier → Services */}
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
            <button
              onClick={() => { setPublishMode(null); setShowCreateProduct(false); }}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ←
            </button>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {publishMode === 'ecrit' && 'Publier par écrit (champs + photo)'}
              {publishMode === 'photo_audio' && 'Publier par photo + audio'}
              {publishMode === 'video' && 'Publier par vidéo'}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Titre</label>
              <input
                type="text"
                value={newProduct.title}
                onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Ex: Ciment Portland 50kg, Fer à béton 12mm…"
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
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">État</label>
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
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Photo + message vocal (max 10 secondes)
                </label>
                <div className="rounded-xl border-2 border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20 p-4 space-y-3">
                  <div>
                    <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Photo du matériau</span>
                    <input
                      type="file" accept="image/*" capture="environment"
                      onChange={(e) => setNewProduct(prev => ({ ...prev, photoForAudio: e.target.files?.[0] || null }))}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-800 dark:file:bg-amber-900/30 dark:file:text-amber-200"
                    />
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
                <div className="rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20 p-4">
                  <VideoRecorder maxDuration={10} onVideoRecorded={(blob) => {
                    const file = new File([blob], `video-${Date.now()}.webm`, { type: blob.type || 'video/webm' });
                    setNewProduct(prev => ({ ...prev, videos: [file, ...prev.videos] }));
                  }} />
                  {newProduct.videos.length > 0 && (
                    <p className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">✓ Vidéo enregistrée</p>
                  )}
                </div>
              </div>
            )}

            {publishMode === 'ecrit' && (
              <>
                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">📷 Photos</label>
                  <input
                    type="file" accept="image/*" multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
                      setNewProduct(p => ({ ...p, images: [...p.images, ...files] }));
                    }}
                    className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-800 dark:file:bg-amber-900/30 dark:file:text-amber-200"
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
                    placeholder="Décrivez vos matériaux (quantité, qualité, origine…)"
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

      {/* Grille des annonces */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <p className="text-gray-600 dark:text-gray-400 text-lg">Aucun matériau disponible pour le moment.</p>
            {userData && (
              <button
                onClick={() => { setShowCreateProduct(true); setPublishMode(null); }}
                className="mt-4 px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700"
              >
                ➕ Publier la première annonce
              </button>
            )}
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all"
            >
              {product.images && product.images.length > 0 ? (
                <img
                  src={buildImageUrl(product.images[0])} alt={product.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : product.videos && product.videos.length > 0 ? (
                <video
                  src={buildImageUrl(product.videos[0])}
                  className="w-full h-48 object-cover"
                  autoPlay muted loop playsInline
                  onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
                />
              ) : (product as any).audio && (product as any).audio.length > 0 ? (
                <div className="w-full h-48 bg-amber-50 dark:bg-amber-900/20 flex flex-col items-center justify-center gap-2 px-4">
                  <span className="text-4xl">🎙️</span>
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium text-center">Message vocal du vendeur</p>
                  <audio src={buildImageUrl((product as any).audio[0])} controls className="w-full" />
                </div>
              ) : (
                <div className="w-full h-48 bg-amber-50 dark:bg-amber-900/20 flex flex-col items-center justify-center gap-2">
                  <span className="text-5xl">🧱</span>
                  <p className="text-xs text-gray-400">Pas encore de photo</p>
                </div>
              )}

              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{product.title}</h3>
                  <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded-full text-xs font-medium">
                    Matériaux
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
            </div>
          ))
        )}
      </div>

      {/* Modal contact */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{selectedProduct.title}</h3>
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">Matériaux de construction</p>
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
