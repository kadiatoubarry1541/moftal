import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/api';
import { sortAnyByProximity, getUserGeoContext } from '../utils/proximity';
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

export default function EchangeMedicament() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [products, setProducts] = useState<ExchangeProduct[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showSupplierRegistration, setShowSupplierRegistration] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ExchangeProduct | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState<'medicaments-generiques' | 'medicaments-specialises' | 'equipements-medicaux'>('medicaments-generiques');
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
    const session = localStorage.getItem("session_user");
    if (!session) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(session);
      const user = parsed.userData || parsed;
      if (!user || !user.numeroH) {
        navigate("/login");
        return;
      }
      
      setUserData(user);
      loadData();
    } catch {
      navigate("/login");
    }
  }, [navigate]);

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
        setProducts(sortAnyByProximity(productsData.products || [], getUserGeoContext()));
      } else {
        setProducts([]);
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
        setSuppliers(sortAnyByProximity(suppliersData.suppliers || [], getUserGeoContext()));
      } else {
        setSuppliers([]);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setProducts([]);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async () => {
    try {
      const formData = new FormData();
      formData.append('title', newProduct.title);
      formData.append('description', newProduct.description);
      formData.append('category', newProduct.category);
      formData.append('level', 'primaire');
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
      const endpoint = `${config.API_BASE_URL}/exchange/primaire/products`;
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
        alert('Erreur lors de la création du produit');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du produit');
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
    if (!products || !Array.isArray(products)) {
      return [];
    }
    
    if (activeTab === 'medicaments-generiques') {
      return products.filter(p => {
        if (!p) return false;
        const cat = (p.category || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        return cat.includes('médicament') || cat.includes('medicament') || cat.includes('générique') ||
               title.includes('générique') || title.includes('paracétamol') || title.includes('ibuprofène') ||
               title.includes('aspirine') || title.includes('doliprane') || title.includes('médicament');
      });
    } else if (activeTab === 'medicaments-specialises') {
      return products.filter(p => {
        if (!p) return false;
        const cat = (p.category || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        return cat.includes('spécialisé') || cat.includes('specialise') || cat.includes('prescription') ||
               title.includes('spécialisé') || title.includes('antibiotique') || title.includes('prescription') ||
               title.includes('antibio') || title.includes('vaccin');
      });
    } else if (activeTab === 'equipements-medicaux') {
      return products.filter(p => {
        if (!p) return false;
        const cat = (p.category || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        return cat.includes('équipement') || cat.includes('equipement') || cat.includes('médical') ||
               title.includes('équipement') || title.includes('stéthoscope') || title.includes('tensiomètre') ||
               title.includes('thermomètre') || title.includes('médical') || title.includes('medical');
      });
    }
    
    return products || [];
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Chargement des produits médicaux...</div>
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

      {/* Boutons seulement */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            onClick={() => setActiveTab('medicaments-generiques')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'medicaments-generiques'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💉 Génériques
          </button>
          <button
            onClick={() => setActiveTab('medicaments-specialises')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'medicaments-specialises'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🏥 Spécialisés
          </button>
          <button
            onClick={() => setActiveTab('equipements-medicaux')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'equipements-medicaux'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🩺 Équipements
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <PublierAnnonceButtons
            onSelect={() => setShowCreateProduct(true)}
            title="Publier une annonce"
          />
          {isAdmin && (
            <button
              onClick={() => setSelectedSupplier({} as Supplier)}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm flex items-center gap-1.5 w-fit"
            >
              <span>⚙️</span>
              <span>Gérer</span>
            </button>
          )}
        </div>
      </div>

      {/* Formulaire de création de produit */}
      {showCreateProduct && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-3xl">💊</div>
            <h3 className="text-2xl font-bold text-gray-900">Publier un produit médical</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Titre du produit</label>
              <input
                type="text"
                value={newProduct.title}
                onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder="Ex: Paracétamol 500mg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Catégorie</label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              >
                <option value="">Sélectionner une catégorie</option>
                <option value="Médicament générique">Médicament générique</option>
                <option value="Médicament spécialisé">Médicament spécialisé</option>
                <option value="Équipement médical">Équipement médical</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Prix</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  placeholder="5000"
                />
                <select
                  value={newProduct.currency}
                  onChange={(e) => setNewProduct({...newProduct, currency: e.target.value})}
                  className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                >
                  <option value="FG">FG</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">État</label>
              <select
                value={newProduct.condition}
                onChange={(e) => setNewProduct({...newProduct, condition: e.target.value as any})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              >
                <option value="neuf">Neuf</option>
                <option value="bon">Bon état</option>
                <option value="moyen">État moyen</option>
                <option value="usé">Usé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Localisation</label>
              <input
                type="text"
                value={newProduct.location}
                onChange={(e) => setNewProduct({...newProduct, location: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder="Ex: Ville Principale"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Photo + message vocal (max 10 secondes)</label>
              <p className="text-xs text-gray-500 mb-2">Prenez une photo du produit et enregistrez un message vocal (max 10 s) pour le présenter.</p>
              <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 mb-4 space-y-3">
                <div>
                  <span className="block text-xs font-medium text-gray-600 mb-1">Photo du produit</span>
                  <input type="file" accept="image/*" capture="environment" onChange={(e) => setNewProduct((prev) => ({ ...prev, photoForAudio: e.target.files?.[0] || null }))} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-100 file:text-teal-800" />
                  {newProduct.photoForAudio && <p className="mt-1 text-xs text-teal-600">✓ Photo sélectionnée</p>}
                </div>
                <div>
                  <span className="block text-xs font-medium text-gray-600 mb-1">Message vocal (max 10 secondes)</span>
                  <AudioRecorder maxDuration={10} onAudioRecorded={(blob) => setNewProduct((prev) => ({ ...prev, audio30s: new File([blob], `audio-30s-${Date.now()}.webm`, { type: blob.type || 'audio/webm' }) }))} />
                  {newProduct.audio30s && <p className="mt-2 text-xs text-emerald-600">✓ Message vocal enregistré</p>}
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Vidéo (max 10 secondes)</label>
              <p className="text-xs text-gray-500 mb-2">Enregistrez une vidéo de 5 à 10 secondes pour présenter votre produit.</p>
              <div className="rounded-xl border-2 border-teal-200 bg-teal-50/50 p-4 mb-4">
                <VideoRecorder
                  maxDuration={10}
                  onVideoRecorded={(blob) => {
                    const file = new File([blob], `video-10s-${Date.now()}.webm`, { type: blob.type || 'video/webm' });
                    setNewProduct((prev) => ({ ...prev, videos: [file, ...prev.videos] }));
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">📷 Photos et Vidéos</label>
              <div className="space-y-3">
                <input
                  type="file"
                  id="media-capture"
                  capture="environment"
                  accept="image/*,video/*,audio/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const images = files.filter(f => f.type.startsWith('image/'));
                    const videos = files.filter(f => f.type.startsWith('video/'));
                    setNewProduct({
                      ...newProduct,
                      images: [...newProduct.images, ...images],
                      videos: [...newProduct.videos, ...videos]
                    });
                  }}
                  className="hidden"
                />
                <input
                  type="file"
                  id="media-gallery"
                  accept="image/*,video/*,audio/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const images = files.filter(f => f.type.startsWith('image/'));
                    const videos = files.filter(f => f.type.startsWith('video/'));
                    setNewProduct({
                      ...newProduct,
                      images: [...newProduct.images, ...images],
                      videos: [...newProduct.videos, ...videos]
                    });
                  }}
                  className="hidden"
                />
                
                <div className="flex gap-3">
                  <label
                    htmlFor="media-capture"
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 cursor-pointer text-center font-medium flex items-center justify-center gap-2"
                  >
                    📷 Prendre une photo/vidéo
                  </label>
                  <label
                    htmlFor="media-gallery"
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200 cursor-pointer text-center font-medium flex items-center justify-center gap-2"
                  >
                    🖼️ Choisir depuis galerie
                  </label>
                </div>
                
                {(newProduct.images.length > 0 || newProduct.videos.length > 0) && (
                  <div className="mt-4">
                    <p className="text-sm text-blue-600 font-medium mb-3">
                      ✅ {newProduct.images.length} photo(s) et {newProduct.videos.length} vidéo(s) sélectionnée(s)
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {newProduct.images.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img 
                            src={URL.createObjectURL(img)} 
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-24 object-cover rounded-lg border-2 border-blue-300"
                          />
                          <button
                            onClick={() => {
                              const newImages = newProduct.images.filter((_, i) => i !== idx);
                              setNewProduct({...newProduct, images: newImages});
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {newProduct.videos.map((vid, idx) => (
                        <div key={`vid-${idx}`} className="relative">
                          <video 
                            src={URL.createObjectURL(vid)} 
                            className="w-full h-24 object-cover rounded-lg border-2 border-indigo-300"
                            muted
                          />
                          <button
                            onClick={() => {
                              const newVideos = newProduct.videos.filter((_, i) => i !== idx);
                              setNewProduct({...newProduct, videos: newVideos});
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
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
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                rows={4}
                placeholder="Décrivez votre produit en détail..."
              />
            </div>
          </div>
          
          <div className="flex gap-4 mt-8">
            <button
              onClick={createProduct}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              ✅ Publier le Produit
            </button>
            <button
              onClick={() => setShowCreateProduct(false)}
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
                placeholder="Ex: Pharmacie ABC"
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
                placeholder="contact@pharmacie.com"
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

      {/* Liste des produits */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {getFilteredProducts().length === 0 ? (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-600 text-lg">Aucun produit dans cette catégorie pour le moment.</p>
              <button
                onClick={() => setShowCreateProduct(true)}
                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200"
              >
                ➕ Publier le premier produit
              </button>
            </div>
          ) : (
            getFilteredProducts().map((product) => (
              <div key={product.id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-300 overflow-hidden">
                {/* Media : photo, vidéo ou audio */}
                {product.images && product.images.length > 0 ? (
                  <img src={`${(config.API_BASE_URL || '').replace(/\/api\/?$/, '')}${product.images[0].startsWith('/') ? '' : '/'}${product.images[0]}`} alt={product.title}
                    className="w-full h-48 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                ) : product.videos && product.videos.length > 0 ? (
                  <video
                    src={`${(config.API_BASE_URL || '').replace(/\/api\/?$/, '')}${product.videos[0].startsWith('/') ? '' : '/'}${product.videos[0]}`}
                    className="w-full h-48 object-cover"
                    autoPlay muted loop playsInline
                    onError={(e) => { (e.target as HTMLVideoElement).style.display='none'; }}
                  />
                ) : (product as any).audio && (product as any).audio.length > 0 ? (
                  <div className="w-full h-48 bg-amber-50 flex flex-col items-center justify-center gap-2 px-4">
                    <span className="text-4xl">🎙️</span>
                    <p className="text-xs text-amber-700 font-medium text-center">Message vocal du vendeur</p>
                    <audio src={`${(config.API_BASE_URL || '').replace(/\/api\/?$/, '')}${(product as any).audio[0].startsWith('/') ? '' : '/'}${(product as any).audio[0]}`} controls className="w-full" />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-blue-50 flex flex-col items-center justify-center gap-2">
                    <span className="text-5xl">📷</span>
                    <p className="text-xs text-gray-400">Pas encore de photo</p>
                  </div>
                )}
                <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{product.title}</h3>
                    <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">
                      {product.category}
                    </span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold animate-pulse ${
                    product.condition === 'neuf' ? 'bg-green-100 text-green-800 shadow-lg shadow-green-200' :
                    product.condition === 'bon' ? 'bg-blue-100 text-blue-800 shadow-lg shadow-blue-200' :
                    product.condition === 'moyen' ? 'bg-yellow-100 text-yellow-800 shadow-lg shadow-yellow-200' :
                    'bg-red-100 text-red-800 shadow-lg shadow-red-200'
                  }`}>
                    {product.condition}
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4 text-sm leading-relaxed line-clamp-2">{product.description}</p>
                
                <div className="mb-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
                  <div className="text-xs uppercase tracking-wide mb-1">Prix</div>
                  <div className="text-2xl font-black">
                    {product.price.toLocaleString()} {product.currency}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-4 flex items-center gap-2">
                  <span className="text-lg">📍</span>
                  <span className="font-medium">{product.location}</span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    📞 Contacter
                  </button>
                  <button className="px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                    ❤️
                  </button>
                </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
                
                <p className="text-gray-700 mb-4 text-sm">{supplier.description}</p>
                
                <div className="mb-4">
                  <h5 className="font-semibold text-gray-900 mb-2">Contact :</h5>
                  <p className="text-sm text-gray-600">📞 {supplier.contactInfo?.phone || 'Non renseigné'}</p>
                  <p className="text-sm text-gray-600">📧 {supplier.contactInfo?.email || 'Non renseigné'}</p>
                </div>
                
                {!supplier.isApproved && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveSupplier(supplier.id)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium"
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
                <p className="text-xl font-bold text-blue-600">
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
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold"
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

      {getFilteredProducts().length === 0 && products.length === 0 && (
        <div className="text-center text-gray-500 py-20">
          <div className="text-8xl mb-6">💊</div>
          <h3 className="text-2xl font-bold mb-4">Aucun produit médical</h3>
          <p className="text-lg mb-6">Soyez le premier à publier un produit médical !</p>
          <button
            onClick={() => setShowCreateProduct(true)}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-lg"
          >
            ➕ Publier le premier produit
          </button>
        </div>
      )}
    </div>
  );
}

