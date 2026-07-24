import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/api';

const API_ORIGIN = (config.API_BASE_URL || '').replace(/\/api\/?$/, '') || '';

interface PreviewProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  imageUrl?: string;
}

interface EchangesProfessionnelProps {
  userData?: any;
}

const APERÇU_PRIMAIRE: PreviewProduct[] = [
  { id: '1', title: 'Riz Local Premium', price: 15000, currency: 'FG' },
  { id: '2', title: 'Huile de Palme Artisanale', price: 8000, currency: 'FG' },
];

const APERÇU_SECONDAIRE: PreviewProduct[] = [
  { id: '1', title: 'Machine à Coudre Industrielle', price: 1200000, currency: 'FG' },
  { id: '2', title: 'Générateur Diesel 5KVA', price: 2500000, currency: 'FG' },
];

const APERÇU_TERTIAIRE: PreviewProduct[] = [
  { id: '1', title: 'Ciment Portland 50kg', price: 85000, currency: 'FG' },
  { id: '2', title: 'Tôles ondulées (lot de 10)', price: 120000, currency: 'FG' },
];

const APERÇU_QUATERNAIRE: PreviewProduct[] = [
  { id: '1', title: 'Samsung Galaxy A54', price: 3500000, currency: 'FG' },
  { id: '2', title: 'Laptop HP 15 pouces', price: 6500000, currency: 'FG' },
];

const APERÇU_MEDICAMENT: PreviewProduct[] = [
  { id: '1', title: 'Paracétamol 500mg (boîte)', price: 5000, currency: 'FG' },
  { id: '2', title: 'Amoxicilline 500mg', price: 12000, currency: 'FG' },
];

function buildImageUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

function ApercuImage({ src, alt, placeholder }: { src?: string; alt: string; placeholder: string }) {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;
  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-inherit">
      {showImg ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span className="text-2xl" aria-hidden>{placeholder}</span>
      )}
    </div>
  );
}

export function EchangesProfessionnel({ userData: _u }: EchangesProfessionnelProps) {
  const navigate = useNavigate();
  const [previewPrimaire, setPreviewPrimaire] = useState<PreviewProduct[]>(APERÇU_PRIMAIRE);
  const [previewSecondaire, setPreviewSecondaire] = useState<PreviewProduct[]>(APERÇU_SECONDAIRE);
  const [previewTertiaire, setPreviewTertiaire] = useState<PreviewProduct[]>(APERÇU_TERTIAIRE);
  const [previewQuaternaire, setPreviewQuaternaire] = useState<PreviewProduct[]>(APERÇU_QUATERNAIRE);
  const [loadingPreview, setLoadingPreview] = useState(true);

  useEffect(() => {
    const getToken = () => {
      try {
        const s = localStorage.getItem('session_user');
        return s ? JSON.parse(s).token : null;
      } catch { return null; }
    };
    const token = getToken();
    const loadPreviews = async () => {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [resP, resS, resT, resQ] = await Promise.all([
          fetch(`${config.API_BASE_URL}/exchange/primaire/products`, { headers }),
          fetch(`${config.API_BASE_URL}/exchange/secondaire/products`, { headers }),
          fetch(`${config.API_BASE_URL}/exchange/tertiaire/products`, { headers }),
          fetch(`${config.API_BASE_URL}/exchange/quaternaire/products`, { headers }),
        ]);

        if (resP.ok) {
          const data = await resP.json();
          const list = (data.products || []).slice(0, 2).map((p: any) => ({
            id: p.id, title: p.title, price: Number(p.price), currency: p.currency || 'FG',
            imageUrl: buildImageUrl(p.images?.[0]),
          }));
          if (list.length) setPreviewPrimaire(list);
        }
        if (resS.ok) {
          const data = await resS.json();
          const list = (data.products || []).slice(0, 2).map((p: any) => ({
            id: p.id, title: p.title, price: Number(p.price), currency: p.currency || 'FG',
            imageUrl: buildImageUrl(p.images?.[0]),
          }));
          if (list.length) setPreviewSecondaire(list);
        }
        if (resT.ok) {
          const data = await resT.json();
          const list = (data.products || []).slice(0, 2).map((p: any) => ({
            id: p.id, title: p.title, price: Number(p.price), currency: p.currency || 'FG',
            imageUrl: buildImageUrl(p.images?.[0]),
          }));
          if (list.length) setPreviewTertiaire(list);
        }
        if (resQ.ok) {
          const data = await resQ.json();
          const list = (data.products || []).slice(0, 2).map((p: any) => ({
            id: p.id, title: p.title, price: Number(p.price), currency: p.currency || 'FG',
            imageUrl: buildImageUrl(p.images?.[0]),
          }));
          if (list.length) setPreviewQuaternaire(list);
        }
      } catch {
        // Garder les aperçus par défaut
      } finally {
        setLoadingPreview(false);
      }
    };
    loadPreviews();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pt-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Échanges</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Choisis ta catégorie</p>
        </div>
        <button className="w-9 h-9 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* ── SECTEUR PRIMAIRE ── */}
        <div className="rounded-xl border-2 border-green-200 bg-gradient-to-b from-green-50 to-white dark:from-green-900/20 dark:to-gray-900 overflow-hidden shadow-md hover:shadow-lg transition-shadow">
          <button
            onClick={() => navigate('/echange/primaire')}
            className="w-full bg-green-600 hover:bg-green-700 p-4 transition-all cursor-pointer text-white flex items-center gap-3"
          >
            <div className="grid grid-cols-2 gap-0.5 w-14 h-14 flex-shrink-0 bg-white/20 rounded-xl p-1.5">
              <span className="flex items-center justify-center text-lg leading-none">🌾</span>
              <span className="flex items-center justify-center text-lg leading-none">🐓</span>
              <span className="flex items-center justify-center text-lg leading-none">🥬</span>
              <span className="flex items-center justify-center text-lg leading-none">🐟</span>
            </div>
            <div className="text-left">
              <p className="font-bold text-base">Primaire</p>
              <p className="text-xs opacity-90">Céréales · Légumes · Animaux · Poissons</p>
            </div>
            <span className="ml-auto text-lg opacity-70">›</span>
          </button>
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Aperçu des produits</p>
            {loadingPreview ? (
              <p className="text-sm text-gray-400">Chargement…</p>
            ) : (
              <div className="space-y-2">
                {previewPrimaire.map((p) => (
                  <div key={p.id} className="flex gap-3 rounded-lg overflow-hidden bg-white dark:bg-gray-800/50 border border-green-100 dark:border-green-800/50">
                    <div className="w-16 h-16 flex-shrink-0 bg-green-100 dark:bg-green-900/30 rounded-l-lg overflow-hidden">
                      <ApercuImage src={p.imageUrl} alt={p.title} placeholder="🌾" />
                    </div>
                    <div className="flex-1 min-w-0 py-2 pr-2 flex flex-col justify-center">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.title}</p>
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">{p.price.toLocaleString()} {p.currency}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => navigate('/echange/primaire')}
              className="mt-3 w-full py-2 text-sm font-medium text-green-600 hover:text-green-700 border border-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              Voir tout →
            </button>
          </div>
        </div>

        {/* ── SECTEUR SECONDAIRE ── */}
        <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 overflow-hidden shadow-md hover:shadow-lg transition-shadow">
          <button
            onClick={() => navigate('/echange/secondaire')}
            className="w-full bg-blue-600 hover:bg-blue-700 p-4 transition-all cursor-pointer text-white flex items-center gap-3"
          >
            <div className="grid grid-cols-2 gap-0.5 w-14 h-14 flex-shrink-0 bg-white/20 rounded-xl p-1.5">
              <span className="flex items-center justify-center text-lg leading-none">👗</span>
              <span className="flex items-center justify-center text-lg leading-none">👟</span>
              <span className="flex items-center justify-center text-lg leading-none">👜</span>
              <span className="flex items-center justify-center text-lg leading-none">💄</span>
            </div>
            <div className="text-left">
              <p className="font-bold text-base">Secondaire</p>
              <p className="text-xs opacity-90">Habits · Chaussures · Sacs · Cosmétiques</p>
            </div>
            <span className="ml-auto text-lg opacity-70">›</span>
          </button>
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Aperçu des produits</p>
            {loadingPreview ? (
              <p className="text-sm text-gray-400">Chargement…</p>
            ) : (
              <div className="space-y-2">
                {previewSecondaire.map((p) => (
                  <div key={p.id} className="flex gap-3 rounded-lg overflow-hidden bg-white dark:bg-gray-800/50 border border-blue-100 dark:border-blue-800/50">
                    <div className="w-16 h-16 flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 rounded-l-lg overflow-hidden">
                      <ApercuImage src={p.imageUrl} alt={p.title} placeholder="🏭" />
                    </div>
                    <div className="flex-1 min-w-0 py-2 pr-2 flex flex-col justify-center">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.title}</p>
                      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{p.price.toLocaleString()} {p.currency}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => navigate('/echange/secondaire')}
              className="mt-3 w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              Voir tout →
            </button>
          </div>
        </div>

        {/* ── SECTEUR TERTIAIRE ── */}
        <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-b from-amber-50 to-white dark:from-amber-900/20 dark:to-gray-900 overflow-hidden shadow-md hover:shadow-lg transition-shadow">
          <button
            onClick={() => navigate('/echange/tertiaire')}
            className="w-full bg-amber-600 hover:bg-amber-700 p-4 transition-all cursor-pointer text-white flex items-center gap-3"
          >
            <div className="grid grid-cols-2 gap-0.5 w-14 h-14 flex-shrink-0 bg-white/20 rounded-xl p-1.5">
              <span className="flex items-center justify-center text-lg leading-none">🛋️</span>
              <span className="flex items-center justify-center text-lg leading-none">❄️</span>
              <span className="flex items-center justify-center text-lg leading-none">🧱</span>
              <span className="flex items-center justify-center text-lg leading-none">🔧</span>
            </div>
            <div className="text-left">
              <p className="font-bold text-base">Tertiaire</p>
              <p className="text-xs opacity-90">Meubles · Électroménager · Matériaux · Outils</p>
            </div>
            <span className="ml-auto text-lg opacity-70">›</span>
          </button>
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Aperçu des produits</p>
            {loadingPreview ? (
              <p className="text-sm text-gray-400">Chargement…</p>
            ) : (
              <div className="space-y-2">
                {previewTertiaire.map((p) => (
                  <div key={p.id} className="flex gap-3 rounded-lg overflow-hidden bg-white dark:bg-gray-800/50 border border-amber-100 dark:border-amber-800/50">
                    <div className="w-16 h-16 flex-shrink-0 bg-amber-100 dark:bg-amber-900/30 rounded-l-lg overflow-hidden">
                      <ApercuImage src={p.imageUrl} alt={p.title} placeholder="🧱" />
                    </div>
                    <div className="flex-1 min-w-0 py-2 pr-2 flex flex-col justify-center">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.title}</p>
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{p.price.toLocaleString()} {p.currency}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => navigate('/echange/tertiaire')}
              className="mt-3 w-full py-2 text-sm font-medium text-amber-600 hover:text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              Voir tout →
            </button>
          </div>
        </div>

        {/* ── SECTEUR QUATERNAIRE ── */}
        <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-b from-violet-50 to-white dark:from-violet-900/20 dark:to-gray-900 overflow-hidden shadow-md hover:shadow-lg transition-shadow">
          <button
            onClick={() => navigate('/echange/quaternaire')}
            className="w-full bg-violet-600 hover:bg-violet-700 p-4 transition-all cursor-pointer text-white flex items-center gap-3"
          >
            <div className="grid grid-cols-2 gap-0.5 w-14 h-14 flex-shrink-0 bg-white/20 rounded-xl p-1.5">
              <span className="flex items-center justify-center text-lg leading-none">📱</span>
              <span className="flex items-center justify-center text-lg leading-none">💻</span>
              <span className="flex items-center justify-center text-lg leading-none">📺</span>
              <span className="flex items-center justify-center text-lg leading-none">🚗</span>
            </div>
            <div className="text-left">
              <p className="font-bold text-base">Quaternaire</p>
              <p className="text-xs opacity-90">Téléphones · Ordinateurs · TV · Voitures</p>
            </div>
            <span className="ml-auto text-lg opacity-70">›</span>
          </button>
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Aperçu des produits</p>
            {loadingPreview ? (
              <p className="text-sm text-gray-400">Chargement…</p>
            ) : (
              <div className="space-y-2">
                {previewQuaternaire.map((p) => (
                  <div key={p.id} className="flex gap-3 rounded-lg overflow-hidden bg-white dark:bg-gray-800/50 border border-violet-100 dark:border-violet-800/50">
                    <div className="w-16 h-16 flex-shrink-0 bg-violet-100 dark:bg-violet-900/30 rounded-l-lg overflow-hidden">
                      <ApercuImage src={p.imageUrl} alt={p.title} placeholder="💻" />
                    </div>
                    <div className="flex-1 min-w-0 py-2 pr-2 flex flex-col justify-center">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.title}</p>
                      <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">{p.price.toLocaleString()} {p.currency}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => navigate('/echange/quaternaire')}
              className="mt-3 w-full py-2 text-sm font-medium text-violet-600 hover:text-violet-700 border border-violet-300 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
            >
              Voir tout →
            </button>
          </div>
        </div>

        {/* ── PHARMACIE / MÉDICAMENT ── */}
        <div className="rounded-xl border-2 border-teal-200 bg-gradient-to-b from-teal-50 to-white dark:from-teal-900/20 dark:to-gray-900 overflow-hidden shadow-md hover:shadow-lg transition-shadow">
          <button
            onClick={() => navigate('/echange/medicament')}
            className="w-full bg-teal-600 hover:bg-teal-700 p-4 transition-all cursor-pointer text-white flex items-center gap-3"
          >
            <div className="grid grid-cols-2 gap-0.5 w-14 h-14 flex-shrink-0 bg-white/20 rounded-xl p-1.5">
              <span className="flex items-center justify-center text-lg leading-none">💊</span>
              <span className="flex items-center justify-center text-lg leading-none">🩹</span>
              <span className="flex items-center justify-center text-lg leading-none">🌡️</span>
              <span className="flex items-center justify-center text-lg leading-none">⚕️</span>
            </div>
            <div className="text-left">
              <p className="font-bold text-base">Pharmacie</p>
              <p className="text-xs opacity-90">Médicaments · Matériel médical · Hygiène</p>
            </div>
            <span className="ml-auto text-lg opacity-70">›</span>
          </button>
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Aperçu des produits</p>
            <div className="space-y-2">
              {APERÇU_MEDICAMENT.map((p) => (
                <div key={p.id} className="flex gap-3 rounded-lg overflow-hidden bg-white dark:bg-gray-800/50 border border-teal-100 dark:border-teal-800/50">
                  <div className="w-16 h-16 flex-shrink-0 bg-teal-100 dark:bg-teal-900/30 rounded-l-lg overflow-hidden">
                    <ApercuImage src={p.imageUrl} alt={p.title} placeholder="💊" />
                  </div>
                  <div className="flex-1 min-w-0 py-2 pr-2 flex flex-col justify-center">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.title}</p>
                    <p className="text-sm font-semibold text-teal-600 dark:text-teal-400">{p.price.toLocaleString()} {p.currency}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/echange/medicament')}
              className="mt-3 w-full py-2 text-sm font-medium text-teal-600 hover:text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
            >
              Voir tout →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
