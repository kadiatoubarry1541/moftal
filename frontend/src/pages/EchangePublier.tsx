import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { config } from '../config/api';
import { VideoRecorder } from '../components/VideoRecorder';
import { AudioRecorder } from '../components/AudioRecorder';
import { useI18n } from '../i18n/useI18n';

type PublishMode = 'ecrit' | 'photo_audio' | 'video';
type Level = 'primaire' | 'secondaire' | 'tertiaire' | 'quaternaire';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  [key: string]: unknown;
}

const CATEGORIES_PRIMAIRE = ['Alimentation', 'Aliments', 'Textile', 'Agriculture', 'Artisanat', 'Matières Premières', 'Autre'];
const CATEGORIES_SECONDAIRE = ['Électronique', 'Machinerie', 'Équipements', 'Véhicules', 'Autre'];
const CATEGORIES_TERTIAIRE = ['Maison à louer', 'Matériaux de construction', 'Services', 'Autre'];
const CATEGORIES_QUATERNAIRE = ['Téléphones', 'Ordinateurs', 'TV & Son', 'Accessoires', 'Véhicules', 'Autre'];

function getModes(t: (key: string) => string) {
  return [
    {
      key: 'ecrit' as PublishMode,
      icon: '💬',
      label: t('echange_publier.mode_ecrit_label'),
      sub: t('echange_publier.mode_ecrit_sub'),
      desc: t('echange_publier.mode_ecrit_desc'),
      border: 'border-emerald-500',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      btn: 'bg-emerald-600 hover:bg-emerald-700',
    },
    {
      key: 'photo_audio' as PublishMode,
      icon: '📷',
      label: t('echange_publier.mode_photo_audio_label'),
      sub: t('echange_publier.mode_photo_audio_sub'),
      desc: t('echange_publier.mode_photo_audio_desc'),
      border: 'border-amber-500',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      btn: 'bg-amber-500 hover:bg-amber-600',
    },
    {
      key: 'video' as PublishMode,
      icon: '🎥',
      label: t('echange_publier.mode_video_label'),
      sub: t('echange_publier.mode_video_sub'),
      desc: t('echange_publier.mode_video_desc'),
      border: 'border-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      btn: 'bg-blue-600 hover:bg-blue-700',
    },
  ];
}

function Toast({ message, type, onClose }: { message: string; type: 'error' | 'success'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold border whitespace-nowrap ${
      type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
    }`}>
      <span>{type === 'error' ? '⚠️' : '✅'}</span>
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 font-bold">✕</button>
    </div>
  );
}

export default function EchangePublier() {
  const { t } = useI18n();
  const MODES = getModes(t);
  const [searchParams] = useSearchParams();
  const modeFromUrl = searchParams.get('mode') as PublishMode | null;
  const validMode = modeFromUrl && ['ecrit', 'photo_audio', 'video'].includes(modeFromUrl) ? modeFromUrl : null;

  const [userData, setUserData] = useState<UserData | null>(null);
  const [publishMode, setPublishMode] = useState<PublishMode | null>(validMode);
  const [level, setLevel] = useState<Level>('primaire');
  const [approvedSectors, setApprovedSectors] = useState<Level[]>([]);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [product, setProduct] = useState({
    title: '', description: '', category: '',
    price: '', currency: 'FG', condition: 'bon', location: '',
    images: [] as File[],
    videos: [] as File[],
    photoForAudio: null as File | null,
    audio30s: null as File | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const imgCaptureRef = useRef<HTMLInputElement>(null);
  const imgGalleryRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const categories = level === 'primaire' ? CATEGORIES_PRIMAIRE : level === 'secondaire' ? CATEGORIES_SECONDAIRE : level === 'tertiaire' ? CATEGORIES_TERTIAIRE : CATEGORIES_QUATERNAIRE;

  useEffect(() => {
    const session = localStorage.getItem('session_user');
    if (!session) { navigate('/login'); return; }
    try {
      const parsed = JSON.parse(session);
      const user = parsed.userData || parsed;
      if (!user?.numeroH) { navigate('/login'); return; }
      setUserData(user);
    } catch {
      navigate('/login');
      return;
    }

    const token = localStorage.getItem('token');
    fetch(`${config.API_BASE_URL}/exchange/vendor-status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.success) return;
        setIsAdminUser(!!data.isAdmin);
        const sectors = (data.approvedSectors || []) as Level[];
        setApprovedSectors(sectors);
        if (sectors.length > 0) setLevel(sectors[0]);
      })
      .catch(() => {});
  }, [navigate]);

  const showToast = (message: string, type: 'error' | 'success') => setToast({ message, type });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (publishMode === 'ecrit') {
      if (!product.title.trim()) errs.title = t('echange_publier.err_title_required');
      if (!product.category) errs.category = t('echange_publier.err_category_required');
      if (!product.price || Number(product.price) <= 0) errs.price = t('echange_publier.err_price_required');
      if (!product.location.trim()) errs.location = t('echange_publier.err_location_required');
      if (product.images.length === 0) errs.images = t('echange_publier.err_images_required');
    } else if (publishMode === 'photo_audio') {
      if (!product.title.trim()) errs.title = t('echange_publier.err_title_required');
      if (!product.category) errs.category = t('echange_publier.err_category_required');
      if (!product.photoForAudio) errs.photoForAudio = t('echange_publier.err_photo_required');
      if (!product.audio30s) errs.audio30s = t('echange_publier.err_audio_required');
    } else if (publishMode === 'video') {
      if (!product.title.trim()) errs.title = t('echange_publier.err_title_required');
      if (!product.category) errs.category = t('echange_publier.err_category_required');
      if (product.videos.length === 0) errs.videos = t('echange_publier.err_video_required');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) { showToast(t('echange_publier.toast_fix_fields'), 'error'); return; }
    setSubmitting(true);

    // Empêche le bouton de rester bloqué indéfiniment si la connexion coupe pendant l'envoi
    // (photo/audio/vidéo peuvent être lourds sur une connexion lente).
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const formData = new FormData();
      formData.append('title', product.title.trim());
      formData.append('description', product.description.trim() || 'Produit présenté');
      formData.append('category', product.category);
      formData.append('price', String(Number(product.price) || 0));
      formData.append('currency', product.currency);
      formData.append('condition', product.condition);
      formData.append('location', product.location.trim() || 'Non précisé');
      product.images.forEach((img, i) => formData.append(`image_${i}`, img));
      if (product.photoForAudio) formData.append(`image_${product.images.length}`, product.photoForAudio);
      product.videos.forEach((vid, i) => formData.append(`video_${i}`, vid));
      if (product.audio30s) formData.append('audio_0', product.audio30s);

      const token = localStorage.getItem('token');
      const res = await fetch(`${config.API_BASE_URL}/exchange/${level}/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        showToast(t('echange_publier.toast_success'), 'success');
        setTimeout(() => navigate('/echange'), 1500);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || t('echange_publier.toast_error_publish'), 'error');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      showToast(
        err?.name === 'AbortError'
          ? t('echange_publier.toast_timeout')
          : t('echange_publier.toast_network_error'),
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setPublishMode(null);
    setErrors({});
    setProduct({ title: '', description: '', category: '', price: '', currency: 'FG', condition: 'bon', location: '', images: [], videos: [], photoForAudio: null, audio30s: null });
  };

  const modeConfig = MODES.find(m => m.key === publishMode);

  if (!userData) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ══ HEADER ══ */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => publishMode ? resetForm() : navigate('/echange')}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            ←
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg">{modeConfig ? modeConfig.icon : '🛒'}</span>
            <span className="font-bold text-gray-800 text-sm sm:text-base truncate">
              {modeConfig ? `${t('echange_publier.publish_prefix')} ${modeConfig.label}` : t('echange_publier.new_publication')}
            </span>
          </div>
          {modeConfig && (
            <span className={`hidden sm:inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full ${modeConfig.bg} ${modeConfig.text}`}>
              {modeConfig.icon} {modeConfig.label}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ══ CHOIX DU MODE ══ */}
        {!publishMode && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{t('echange_publier.how_publish_title')}</h1>
              <p className="mt-2 text-gray-500 text-sm">{t('echange_publier.how_publish_desc')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {MODES.map((m, i) => (
                <button
                  key={m.key}
                  onClick={() => setPublishMode(m.key)}
                  className={`group relative flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border-2 ${m.border} shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1`}
                >
                  <div className={`absolute top-3 right-3 w-6 h-6 rounded-full ${m.bg} ${m.text} text-xs font-bold flex items-center justify-center`}>
                    {i + 1}
                  </div>
                  <div className={`w-16 h-16 rounded-2xl ${m.bg} flex items-center justify-center text-3xl`}>
                    {m.icon}
                  </div>
                  <div className="text-center">
                    <p className={`font-bold text-base ${m.text}`}>{m.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.sub}</p>
                  </div>
                  <p className="text-xs text-gray-500 text-center leading-relaxed">{m.desc}</p>
                  <div className={`w-full mt-1 py-2 rounded-xl ${m.btn} text-white text-sm font-semibold text-center`}>
                    {t('echange_publier.choose_btn')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══ FORMULAIRE ══ */}
        {publishMode && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

            {/* Secteur — visible pour tous les modes, limité aux secteurs où vous êtes approuvé */}
            <div className="p-6 sm:p-8 pb-0">
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('echange_publier.sector_label')}</label>
              <div className="grid grid-cols-4 gap-2">
                {(['primaire', 'secondaire', 'tertiaire', 'quaternaire'] as Level[]).map(l => {
                  const allowed = isAdminUser || approvedSectors.includes(l);
                  return (
                    <button
                      key={l}
                      disabled={!allowed}
                      onClick={() => { setLevel(l); setProduct(p => ({ ...p, category: '' })); }}
                      title={allowed ? undefined : `${t('echange_publier.not_approved_for')} ${l}`}
                      className={`py-2 rounded-xl text-sm font-semibold border-2 transition-colors capitalize ${
                        !allowed
                          ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                          : level === l
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              {!isAdminUser && approvedSectors.length === 0 && (
                <p className="mt-2 text-xs text-red-500">{t('echange_publier.no_sector_approved')}</p>
              )}
            </div>

            {/* ── Mode 1 : Par écrit ── */}
            {publishMode === 'ecrit' && (
              <div className="p-6 sm:p-8 space-y-5">
                <div className="pb-4 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800">{t('echange_publier.product_details_title')}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{t('echange_publier.required_fields_note')}</p>
                </div>

                {/* Titre */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('echange_publier.title_required_label')}</label>
                  <input type="text" value={product.title} onChange={e => setProduct({ ...product, title: e.target.value })}
                    placeholder={t('echange_publier.title_placeholder')}
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${errors.title ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-emerald-200 focus:border-emerald-400'}`} />
                  {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                </div>

                {/* Catégorie + État */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('echange_publier.category_required_label')}</label>
                    <select value={product.category} onChange={e => setProduct({ ...product, category: e.target.value })}
                      className={`w-full px-3 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 ${errors.category ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-emerald-200 focus:border-emerald-400'}`}>
                      <option value="">{t('echange_publier.choose_dash')}</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('echange_quaternaire.condition_label')}</label>
                    <select value={product.condition} onChange={e => setProduct({ ...product, condition: e.target.value })}
                      className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400">
                      <option value="neuf">{t('echange_primaire.condition_new')}</option>
                      <option value="bon">{t('echange_quaternaire.condition_good')}</option>
                      <option value="moyen">{t('echange_quaternaire.condition_medium')}</option>
                      <option value="usé">{t('echange_quaternaire.condition_worn_badge')}</option>
                    </select>
                  </div>
                </div>

                {/* Prix + Devise */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('echange_publier.price_required_label')}</label>
                  <div className="flex gap-2">
                    <input type="number" value={product.price} onChange={e => setProduct({ ...product, price: e.target.value })}
                      placeholder={t('echange_publier.price_placeholder')}
                      className={`flex-1 px-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 ${errors.price ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-emerald-200 focus:border-emerald-400'}`} />
                    <select value={product.currency} onChange={e => setProduct({ ...product, currency: e.target.value })}
                      className="px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200">
                      <option value="FG">FG</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
                </div>

                {/* Localisation */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('echange_publier.location_required_label')}</label>
                  <input type="text" value={product.location} onChange={e => setProduct({ ...product, location: e.target.value })}
                    placeholder={t('echange_publier.location_placeholder')}
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 ${errors.location ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-emerald-200 focus:border-emerald-400'}`} />
                  {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location}</p>}
                </div>

                {/* Photos */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('echange_publier.photos_required_label')} <span className="font-normal text-gray-400 text-xs">{t('echange_publier.at_least_one')}</span>
                  </label>
                  <input ref={imgCaptureRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
                    onChange={e => { const f = Array.from(e.target.files || []).filter(x => x.type.startsWith('image/')); setProduct(p => ({ ...p, images: [...p.images, ...f] })); }} />
                  <input ref={imgGalleryRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => { const f = Array.from(e.target.files || []).filter(x => x.type.startsWith('image/')); setProduct(p => ({ ...p, images: [...p.images, ...f] })); }} />
                  <div className="flex gap-2">
                    <button onClick={() => imgCaptureRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors">
                      {t('echange_publier.take_photo_btn')}
                    </button>
                    <button onClick={() => imgGalleryRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
                      {t('echange_publier.gallery_btn')}
                    </button>
                  </div>
                  {errors.images && <p className="mt-1 text-xs text-red-500">{errors.images}</p>}
                  {product.images.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {product.images.map((img, i) => (
                        <div key={i} className="relative">
                          <img src={URL.createObjectURL(img)} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                          <button onClick={() => setProduct(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('echange_tertiaire.description_label')} <span className="font-normal text-gray-400 text-xs">{t('echange_publier.optional_note')}</span>
                  </label>
                  <textarea value={product.description} onChange={e => setProduct({ ...product, description: e.target.value })}
                    rows={3} placeholder={t('echange_publier.description_placeholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 resize-none" />
                </div>
              </div>
            )}

            {/* ── Mode 2 : Photo + Audio ── */}
            {publishMode === 'photo_audio' && (
              <div className="p-6 sm:p-8 space-y-5">
                <div className="pb-4 border-b border-amber-100">
                  <h2 className="text-lg font-bold text-gray-800">{t('echange_publier.photo_voice_title')}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{t('echange_publier.photo_voice_desc')}</p>
                </div>

                {/* Titre + Catégorie */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('echange_publier.title_required_label')}</label>
                  <input type="text" value={product.title} onChange={e => setProduct({ ...product, title: e.target.value })}
                    placeholder={t('echange_publier.title_placeholder')}
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${errors.title ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-emerald-200 focus:border-emerald-400'}`} />
                  {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('echange_publier.category_required_label')}</label>
                  <select value={product.category} onChange={e => setProduct({ ...product, category: e.target.value })}
                    className={`w-full px-3 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 ${errors.category ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-emerald-200 focus:border-emerald-400'}`}>
                    <option value="">{t('echange_publier.choose_dash')}</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
                </div>

                {/* Étape 1 */}
                <div className={`rounded-2xl border-2 p-5 space-y-3 ${errors.photoForAudio ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50/40'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                    <p className="text-sm font-bold text-gray-800">{t('echange_secondaire.photo_item_label')}</p>
                    {product.photoForAudio && <span className="ml-auto text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">{t('echange_publier.ready_fem')}</span>}
                  </div>
                  {product.photoForAudio ? (
                    <div className="relative inline-block">
                      <img src={URL.createObjectURL(product.photoForAudio)} alt="" className="w-32 h-32 object-cover rounded-xl border-2 border-amber-200 shadow-sm" />
                      <button onClick={() => setProduct(p => ({ ...p, photoForAudio: null }))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow">×</button>
                    </div>
                  ) : (
                    <>
                      <input type="file" id="pa-capture" accept="image/*" capture="environment" className="hidden"
                        onChange={e => setProduct(p => ({ ...p, photoForAudio: e.target.files?.[0] || null }))} />
                      <input type="file" id="pa-gallery" accept="image/*" className="hidden"
                        onChange={e => setProduct(p => ({ ...p, photoForAudio: e.target.files?.[0] || null }))} />
                      <div className="flex gap-2">
                        <label htmlFor="pa-capture" className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl cursor-pointer transition-colors">
                          {t('echange_primaire.take_photo_btn')}
                        </label>
                        <label htmlFor="pa-gallery" className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl cursor-pointer transition-colors">
                          {t('echange_publier.gallery_btn')}
                        </label>
                      </div>
                    </>
                  )}
                  {errors.photoForAudio && <p className="text-xs text-red-500">{errors.photoForAudio}</p>}
                </div>

                {/* Étape 2 */}
                <div className={`rounded-2xl border-2 p-5 space-y-3 ${errors.audio30s ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50/40'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                    <p className="text-sm font-bold text-gray-800">{t('echange_publier.voice_message_title')} <span className="text-gray-400 font-normal text-xs">{t('echange_publier.max_10s')}</span></p>
                    {product.audio30s && <span className="ml-auto text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">{t('echange_publier.ready_masc')}</span>}
                  </div>
                  {product.audio30s ? (
                    <div className="flex items-center gap-3">
                      <audio src={URL.createObjectURL(product.audio30s)} controls className="flex-1" />
                      <button onClick={() => setProduct(p => ({ ...p, audio30s: null }))}
                        className="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0">{t('echange_publier.delete_btn')}</button>
                    </div>
                  ) : (
                    <>
                      <AudioRecorder maxDuration={5} onAudioRecorded={(blob) => {
                        const file = new File([blob], `audio-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
                        setProduct(p => ({ ...p, audio30s: file }));
                      }} />
                      <div className="flex items-center gap-3 my-1">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 font-medium">{t('echange_publier.or_divider')}</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      <div>
                        <input type="file" id="audio-device" accept="audio/*" className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setProduct(p => ({ ...p, audio30s: f }));
                            e.target.value = '';
                          }} />
                        <label htmlFor="audio-device"
                          className="flex items-center justify-center gap-2 w-full py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl cursor-pointer transition-colors">
                          {t('echange_publier.import_audio_btn')}
                        </label>
                      </div>
                    </>
                  )}
                  {errors.audio30s && <p className="text-xs text-red-500">{errors.audio30s}</p>}
                </div>
              </div>
            )}

            {/* ── Mode 3 : Vidéo ── */}
            {publishMode === 'video' && (
              <div className="p-6 sm:p-8 space-y-5">
                <div className="pb-4 border-b border-blue-100">
                  <h2 className="text-lg font-bold text-gray-800">{t('echange_publier.video_presentation_title')}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{t('echange_publier.video_presentation_desc')}</p>
                </div>

                {/* Titre + Catégorie */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('echange_publier.title_required_label')}</label>
                  <input type="text" value={product.title} onChange={e => setProduct({ ...product, title: e.target.value })}
                    placeholder={t('echange_publier.title_placeholder')}
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${errors.title ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-emerald-200 focus:border-emerald-400'}`} />
                  {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('echange_publier.category_required_label')}</label>
                  <select value={product.category} onChange={e => setProduct({ ...product, category: e.target.value })}
                    className={`w-full px-3 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 ${errors.category ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-emerald-200 focus:border-emerald-400'}`}>
                    <option value="">{t('echange_publier.choose_dash')}</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
                </div>

                <div className={`rounded-2xl border-2 p-5 space-y-4 ${errors.videos ? 'border-red-300 bg-red-50' : 'border-blue-200 bg-blue-50/40'}`}>
                  {product.videos.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-semibold text-sm">✓ {product.videos.length} {t('echange_publier.videos_ready_suffix')}</span>
                        <button onClick={() => setProduct(p => ({ ...p, videos: [] }))}
                          className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium">{t('echange_publier.delete_btn')}</button>
                      </div>
                      {product.videos.map((v, i) => (
                        <video key={i} src={URL.createObjectURL(v)} controls className="w-full rounded-xl max-h-48 bg-black" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <VideoRecorder maxDuration={5} onVideoRecorded={(blob) => {
                        const file = new File([blob], `video-${Date.now()}.webm`, { type: blob.type || 'video/webm' });
                        setProduct(p => ({ ...p, videos: [file, ...p.videos] }));
                      }} />
                      <div className="flex items-center gap-3 my-1">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 font-medium">{t('echange_publier.or_divider')}</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      <div>
                        <input type="file" id="vid-device" accept="video/*" className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const vid = document.createElement('video');
                            vid.preload = 'metadata';
                            vid.onloadedmetadata = () => {
                              URL.revokeObjectURL(vid.src);
                              if (vid.duration > 10) {
                                alert('La vidéo ne doit pas dépasser 5 secondes.');
                                e.target.value = '';
                                return;
                              }
                              setProduct(p => ({ ...p, videos: [f, ...p.videos] }));
                            };
                            vid.src = URL.createObjectURL(f);
                          }} />
                        <label htmlFor="vid-device"
                          className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl cursor-pointer transition-colors">
                          {t('echange_publier.import_video_btn')}
                        </label>
                      </div>
                    </>
                  )}
                  {errors.videos && <p className="text-xs text-red-500">{errors.videos}</p>}
                </div>
              </div>
            )}

            {/* ══ BOUTONS D'ACTION ══ */}
            <div className="px-6 sm:px-8 py-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${modeConfig?.btn || 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {t('echange_publier.publishing')}
                  </>
                ) : t('echange_publier.publish_product_btn')}
              </button>
              <button
                onClick={resetForm}
                disabled={submitting}
                className="sm:w-32 py-3.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {t('btn.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
