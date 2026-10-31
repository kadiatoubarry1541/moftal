import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { config } from '../config/api';
import AjoutMedias from '../components/AjoutMedias';
import { MEDIAS_VIDES, type Medias } from '../utils/medias';
import { useI18n } from '../i18n/useI18n';
import { useTraduction } from '../i18n/traduction';

// Un seul écran pour tout (photo, vidéo, vocal, texte) ; « lot » = plusieurs produits d'un coup
type PublishMode = 'simple' | 'lot';

// Publication de plusieurs produits à la fois : une photo = une annonce
const MAX_LOT = 5;
interface LotItem { file: File; preview: string; title: string; price: string; }
type Level = 'primaire' | 'secondaire' | 'tertiaire' | 'quaternaire' | 'nourriture';
const SECTEURS: Level[] = ['primaire', 'secondaire', 'tertiaire', 'quaternaire', 'nourriture'];

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
const CATEGORIES_NOURRITURE = ['Plats', 'Boissons', 'Pâtisserie', 'Fruits & légumes', 'Autre'];

function Toast({ message, type, onClose }: { message: string; type: 'error' | 'success'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold border w-[calc(100%-2rem)] max-w-md ${
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
  const { tr } = useTraduction();
  const [searchParams] = useSearchParams();
  const validMode: PublishMode = searchParams.get('mode') === 'lot' ? 'lot' : 'simple';

  const [userData, setUserData] = useState<UserData | null>(null);
  const [publishMode, setPublishMode] = useState<PublishMode>(validMode);
  const [medias, setMedias] = useState<Medias>(MEDIAS_VIDES);
  const [plusDeDetails, setPlusDeDetails] = useState(false);
  // Section demandée par le bouton « Publier » de la page d'où l'on vient
  const secteurDemande = SECTEURS.find(x => x === searchParams.get('secteur'));
  const [level, setLevel] = useState<Level>(secteurDemande || 'primaire');
  const [approvedSectors, setApprovedSectors] = useState<Level[]>([]);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [product, setProduct] = useState({
    title: '', description: '', category: '',
    price: '', currency: 'FG', condition: 'bon', location: '',
  });
  const [lot, setLot] = useState<LotItem[]>([]);
  const [lotProgress, setLotProgress] = useState<{ done: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lotGalleryRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const categories = level === 'primaire' ? CATEGORIES_PRIMAIRE : level === 'secondaire' ? CATEGORIES_SECONDAIRE : level === 'tertiaire' ? CATEGORIES_TERTIAIRE : level === 'nourriture' ? CATEGORIES_NOURRITURE : CATEGORIES_QUATERNAIRE;

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
        if (sectors.length > 0 && !(secteurDemande && (data.isAdmin || sectors.includes(secteurDemande)))) setLevel(sectors[0]);
      })
      .catch(() => {});
  }, [navigate, secteurDemande]);

  const showToast = (message: string, type: 'error' | 'success') => setToast({ message, type });

  const ajouterAuLot = (files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'));
    const place = MAX_LOT - lot.length;
    if (images.length > place) showToast(t('echange_publier.lot_max_reached'), 'error');
    const nouveaux = images.slice(0, Math.max(0, place)).map(file => ({ file, preview: URL.createObjectURL(file), title: '', price: '' }));
    if (nouveaux.length) setLot(l => [...l, ...nouveaux]);
  };

  const retirerDuLot = (i: number) => {
    setLot(l => {
      URL.revokeObjectURL(l[i].preview);
      return l.filter((_, j) => j !== i);
    });
  };

  const modifierLot = (i: number, champ: 'title' | 'price', valeur: string) =>
    setLot(l => l.map((it, j) => (j === i ? { ...it, [champ]: valeur } : it)));

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (publishMode === 'simple') {
      if (!product.title.trim()) errs.title = t('echange_publier.err_title_required');
      if (!product.price || Number(product.price) <= 0) errs.price = t('echange_publier.err_price_required');
      if (!medias.images.length && !medias.videos.length && !medias.audios.length) errs.medias = tr('Ajoutez au moins une photo, une vidéo ou un message vocal.');
    } else if (publishMode === 'lot') {
      if (!product.category) errs.category = t('echange_publier.err_category_required');
      if (!product.location.trim()) errs.location = t('echange_publier.err_location_required');
      if (lot.length === 0) errs.images = t('echange_publier.err_images_required');
      lot.forEach((it, i) => {
        if (!it.title.trim()) errs[`lot_${i}_title`] = t('echange_publier.err_title_required');
        if (!it.price || Number(it.price) <= 0) errs[`lot_${i}_price`] = t('echange_publier.err_price_required');
      });
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
      formData.append('category', product.category || 'Autre');
      formData.append('price', String(Number(product.price) || 0));
      formData.append('currency', product.currency);
      formData.append('condition', product.condition);
      formData.append('location', product.location.trim() || 'Non précisé');
      medias.images.forEach((img, i) => formData.append(`image_${i}`, img));
      medias.videos.forEach((vid, i) => formData.append(`video_${i}`, vid));
      medias.audios.forEach((a, i) => formData.append(`audio_${i}`, a));

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
    } catch (err) {
      clearTimeout(timeoutId);
      showToast(
        (err as Error)?.name === 'AbortError'
          ? t('echange_publier.toast_timeout')
          : t('echange_publier.toast_network_error'),
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Chaque photo part avec son nom et son prix : une annonce par photo, envoyées
  // l'une après l'autre. Celles déjà publiées sortent de la liste, pour qu'un
  // nouvel essai n'envoie que les restantes (jamais de doublon).
  const handleSubmitLot = async () => {
    if (!validate()) { showToast(t('echange_publier.toast_fix_fields'), 'error'); return; }
    setSubmitting(true);
    const token = localStorage.getItem('token');
    const items = [...lot];
    let publies = 0;
    setLotProgress({ done: 0, total: items.length });
    for (const it of items) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      try {
        const formData = new FormData();
        formData.append('title', it.title.trim());
        formData.append('description', product.description.trim() || 'Produit présenté');
        formData.append('category', product.category);
        formData.append('price', String(Number(it.price) || 0));
        formData.append('currency', product.currency);
        formData.append('condition', product.condition);
        formData.append('location', product.location.trim());
        formData.append('image_0', it.file);
        const res = await fetch(`${config.API_BASE_URL}/exchange/${level}/products`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || t('echange_publier.toast_error_publish'));
        }
        publies++;
        setLotProgress({ done: publies, total: items.length });
        URL.revokeObjectURL(it.preview);
        setLot(l => l.filter(x => x !== it));
      } catch (err) {
        clearTimeout(timeoutId);
        const raison = err instanceof DOMException && err.name === 'AbortError' ? t('echange_publier.toast_timeout')
          : err instanceof TypeError ? t('echange_publier.toast_network_error')
          : (err instanceof Error && err.message) || t('echange_publier.toast_error_publish');
        showToast(publies > 0 ? `${publies}/${items.length} ${t('echange_publier.lot_partial')} ${raison}` : raison, 'error');
        setSubmitting(false);
        setLotProgress(null);
        return;
      }
    }
    setSubmitting(false);
    setLotProgress(null);
    showToast(`${publies} ${t('echange_publier.lot_success')}`, 'success');
    setTimeout(() => navigate('/echange'), 1500);
  };

  const resetForm = () => {
    setPublishMode('simple');
    setMedias(MEDIAS_VIDES);
    setErrors({});
    lot.forEach(it => URL.revokeObjectURL(it.preview));
    setLot([]);
    setProduct({ title: '', description: '', category: '', price: '', currency: 'FG', condition: 'bon', location: '' });
  };

  if (!userData) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ══ HEADER ══ */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => publishMode === 'lot' ? resetForm() : navigate('/echange')}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            ←
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg">{publishMode === 'lot' ? '🖼️' : '🛒'}</span>
            <span className="font-bold text-gray-800 text-sm sm:text-base truncate">
              {publishMode === 'lot' ? t('echange_publier.lot_title') : tr('Publier un produit')}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ══ FORMULAIRE ══ */}
        {(
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

            {/* Secteur — visible pour tous les modes, limité aux secteurs où vous êtes approuvé */}
            <div className="p-6 sm:p-8 pb-0">
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('echange_publier.sector_label')}</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {SECTEURS.map(l => {
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

            {/* ── Écran unique : on ajoute ce qu'on veut, dans l'ordre qu'on veut ── */}
            {publishMode === 'simple' && (
              <div className="p-5 sm:p-8 space-y-5">
                <div className={errors.medias ? 'rounded-2xl ring-2 ring-red-300 p-2 -m-2' : ''}>
                  <AjoutMedias valeur={medias} onChange={(m) => { setMedias(m); setErrors(e => ({ ...e, medias: '' })); }}
                    desactive={submitting} dureeVideo={30} dureeVocal={30} />
                  {errors.medias && <p className="mt-2 text-xs text-red-500">{errors.medias}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">✏️ {tr('Nom du produit')}</label>
                  <input type="text" value={product.title} onChange={e => setProduct({ ...product, title: e.target.value })}
                    placeholder={t('echange_publier.title_placeholder')}
                    className={`w-full px-4 py-3 border-2 rounded-xl text-base focus:outline-none focus:ring-2 ${errors.title ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-emerald-200 focus:border-emerald-400'}`} />
                  {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">💰 {tr('Prix')}</label>
                  <div className="flex gap-2">
                    <input type="number" inputMode="numeric" value={product.price} onChange={e => setProduct({ ...product, price: e.target.value })}
                      placeholder={t('echange_publier.price_placeholder')}
                      className={`flex-1 min-w-0 px-4 py-3 border-2 rounded-xl text-base focus:outline-none focus:ring-2 ${errors.price ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-emerald-200 focus:border-emerald-400'}`} />
                    <span className="px-4 py-3 rounded-xl bg-gray-100 text-sm font-bold text-gray-600">{product.currency}</span>
                  </div>
                  {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
                </div>

                {/* Le reste est facultatif : rangé pour ne pas fatiguer */}
                <button type="button" onClick={() => setPlusDeDetails(v => !v)}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">
                  {plusDeDetails ? '▲' : '▼'} {tr('Plus de détails (facultatif)')}
                </button>
                {plusDeDetails && (
                  <div className="space-y-4">
                    <textarea value={product.description} onChange={e => setProduct({ ...product, description: e.target.value })}
                      rows={3} placeholder={t('echange_publier.description_placeholder')}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 resize-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <select value={product.category} onChange={e => setProduct({ ...product, category: e.target.value })}
                        className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                        <option value="">{t('echange_publier.category_required_label').replace(/\s*\*\s*$/, '')}</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select value={product.condition} onChange={e => setProduct({ ...product, condition: e.target.value })}
                        className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                        <option value="neuf">{t('echange_primaire.condition_new')}</option>
                        <option value="bon">{t('echange_quaternaire.condition_good')}</option>
                        <option value="moyen">{t('echange_quaternaire.condition_medium')}</option>
                        <option value="usé">{t('echange_quaternaire.condition_worn_badge')}</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={product.location} onChange={e => setProduct({ ...product, location: e.target.value })}
                        placeholder={t('echange_publier.location_placeholder')}
                        className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                      <select value={product.currency} onChange={e => setProduct({ ...product, currency: e.target.value })}
                        className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200">
                        <option value="FG">FG</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                )}

                <button type="button" onClick={() => { setErrors({}); setPublishMode('lot'); }}
                  className="w-full text-center text-sm font-semibold text-violet-600 hover:underline">
                  🖼️ {tr('Publier plusieurs produits à la fois')}
                </button>
              </div>
            )}

            {/* ── Mode 4 : Plusieurs produits à la fois ── */}
            {publishMode === 'lot' && (
              <div className="p-6 sm:p-8 space-y-5">
                <div className="pb-4 border-b border-violet-100">
                  <h2 className="text-lg font-bold text-gray-800">{t('echange_publier.lot_title')}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{t('echange_publier.lot_desc')}</p>
                </div>

                {/* Photos de la galerie */}
                <div>
                  <input ref={lotGalleryRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => { ajouterAuLot(Array.from(e.target.files || [])); e.target.value = ''; }} />
                  {lot.length < MAX_LOT && (
                    <button onClick={() => lotGalleryRef.current?.click()} disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
                      {t('echange_publier.lot_choose_btn')} ({lot.length}/{MAX_LOT})
                    </button>
                  )}
                  {errors.images && <p className="mt-1 text-xs text-red-500">{errors.images}</p>}
                </div>

                {/* Un nom et un prix pour chaque photo */}
                {lot.length > 0 && (
                  <div className="space-y-3">
                    {lot.map((it, i) => (
                      <div key={it.preview} className="flex gap-3 p-3 rounded-2xl border-2 border-violet-100 bg-violet-50/40">
                        <div className="relative flex-shrink-0">
                          <img src={it.preview} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                          {!submitting && (
                            <button onClick={() => retirerDuLot(i)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow">
                              ×
                            </button>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <input type="text" value={it.title} onChange={e => modifierLot(i, 'title', e.target.value)} disabled={submitting}
                            placeholder={t('echange_publier.lot_name_placeholder')}
                            className={`w-full px-3 py-2 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 ${errors[`lot_${i}_title`] ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-violet-200 focus:border-violet-400'}`} />
                          <div className="flex items-center gap-2">
                            <input type="number" value={it.price} onChange={e => modifierLot(i, 'price', e.target.value)} disabled={submitting}
                              placeholder={t('echange_publier.price_placeholder')}
                              className={`flex-1 min-w-0 px-3 py-2 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 ${errors[`lot_${i}_price`] ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-violet-200 focus:border-violet-400'}`} />
                            <span className="text-sm font-semibold text-gray-500">{product.currency}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Infos communes à toutes les photos */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('echange_publier.category_required_label')}</label>
                    <select value={product.category} onChange={e => setProduct({ ...product, category: e.target.value })}
                      className={`w-full px-3 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 ${errors.category ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-violet-200 focus:border-violet-400'}`}>
                      <option value="">{t('echange_publier.choose_dash')}</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('echange_quaternaire.condition_label')}</label>
                    <select value={product.condition} onChange={e => setProduct({ ...product, condition: e.target.value })}
                      className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400">
                      <option value="neuf">{t('echange_primaire.condition_new')}</option>
                      <option value="bon">{t('echange_quaternaire.condition_good')}</option>
                      <option value="moyen">{t('echange_quaternaire.condition_medium')}</option>
                      <option value="usé">{t('echange_quaternaire.condition_worn_badge')}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('echange_publier.lot_currency_label')}</label>
                    <select value={product.currency} onChange={e => setProduct({ ...product, currency: e.target.value })}
                      className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-200">
                      <option value="FG">FG</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('echange_publier.location_required_label')}</label>
                    <input type="text" value={product.location} onChange={e => setProduct({ ...product, location: e.target.value })}
                      placeholder={t('echange_publier.location_placeholder')}
                      className={`w-full px-3 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 ${errors.location ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-violet-200 focus:border-violet-400'}`} />
                    {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ══ BOUTONS D'ACTION ══ */}
            <div className="px-6 sm:px-8 py-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <button
                onClick={publishMode === 'lot' ? handleSubmitLot : handleSubmit}
                disabled={submitting}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${publishMode === 'lot' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {t('echange_publier.publishing')}{lotProgress ? ` ${lotProgress.done}/${lotProgress.total}` : ''}
                  </>
                ) : publishMode === 'lot' && lot.length > 0
                  ? `${t('echange_publier.lot_publish_btn')} (${lot.length})`
                  : t('echange_publier.publish_product_btn')}
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
