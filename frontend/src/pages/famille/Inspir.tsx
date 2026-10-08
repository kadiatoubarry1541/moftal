import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../../config/api';
import PaymentModal from '../../components/PaymentModal';

const API_ORIGIN = (config.API_BASE_URL || '').replace(/\/api\/?$/, '') || 'http://localhost:5002';

// Les médias sont stockés avec leur adresse complète (ImageKit / R2) ;
// les anciens fichiers locaux gardent un chemin relatif au serveur.
const mediaSrc = (url?: string | null) => (!url ? null : /^https?:\/\//i.test(url) ? url : `${API_ORIGIN}${url}`);

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  genre?: string;
  dateNaissance?: string;
  date_naissance?: string;
  role?: string;
  photo?: string;
  [key: string]: any;
}

// Sections d'Inspir : « ce qu'on doit faire POUR l'autre ».
// Homme → Parents · Femmes · Enfants ; Femme → Parents · Hommes · Enfants ;
// moins de 18 ans → Parents seulement ; admin → tout. (Vérifié aussi par le serveur.)
type Section = 'parents' | 'femmes' | 'hommes' | 'enfants';
type SectionTab = 'tout' | Section;

const SECTION_INFO: Record<Section, { label: string; icon: string; pour: string }> = {
  parents: { label: 'Parents', icon: '👨‍👩‍👦', pour: 'Pour nos parents' },
  femmes:  { label: 'Femmes',  icon: '👰',    pour: 'Pour nos femmes' },
  hommes:  { label: 'Hommes',  icon: '🤵',    pour: 'Pour nos maris' },
  enfants: { label: 'Enfants', icon: '🧒',    pour: 'Pour nos enfants' },
};
const ALL_SECTIONS: Section[] = ['parents', 'femmes', 'hommes', 'enfants'];
// Fil principal : vidéos, photos et audio ensemble (comme YouTube / Facebook).
// Bibliothèque : livres (abonnement) + écrits & PDF.
type View = 'fil' | 'bibliotheque';
type BiblioTab = 'livres' | 'ecrits';
type MediaType = 'video' | 'audio' | 'image';
type PostType = MediaType | 'text';

const formatPostDate = (d: string) => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};


function calculateAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const b = new Date(dateNaissance);
  if (isNaN(b.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
  return age;
}

export default function Inspir() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionTab, setSectionTab] = useState<SectionTab>('tout');
  const [publishSection, setPublishSection] = useState<Section>('parents');
  const [view, setView] = useState<View>('fil');
  const [biblioTab, setBiblioTab] = useState<BiblioTab>('livres');
  const [posts, setPosts] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState(false);

  // États Bibliothèque (livres)
  const [aAccesLivres, setAAccesLivres] = useState(false);
  const [prixLivres, setPrixLivres] = useState(5000);
  const [livres, setLivres] = useState<any[]>([]);
  const [livreFile, setLivreFile] = useState<File | null>(null);
  const [livreTitre, setLivreTitre] = useState('');
  const [livreDescription, setLivreDescription] = useState('');
  const [livreAuteur, setLivreAuteur] = useState('');
  const [sendingLivre, setSendingLivre] = useState(false);
  const [achatLivresLoading, setAchatLivresLoading] = useState(false);
  const [showLivresPayment, setShowLivresPayment] = useState(false);

  // Form state
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioTimer, setAudioTimer] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = userData?.role === 'admin' || userData?.role === 'Admin' || userData?.role === 'ADMIN';

  // Sections permises (calcul local immédiat, puis confirmé par le serveur)
  const localSections = (u: UserData): Section[] => {
    if (isAdmin) return [...ALL_SECTIONS];
    const age = calculateAge(u.dateNaissance || u.date_naissance);
    if (age !== null && age < 18) return ['parents'];
    const g = String(u.genre || '').trim().toUpperCase();
    if (['HOMME', 'H', 'M', 'MASCULIN', 'MALE'].includes(g)) return ['parents', 'femmes', 'enfants'];
    if (['FEMME', 'F', 'FEMININ', 'FÉMININ', 'FEMALE'].includes(g)) return ['parents', 'hommes', 'enfants'];
    return ['parents', 'enfants'];
  };

  useEffect(() => {
    if (!userData) return;
    setSections(localSections(userData));
    const token = localStorage.getItem('token');
    fetch(`${API_ORIGIN}/api/organizations/inspir/sections`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success && Array.isArray(d.sections)) setSections(d.sections.filter((x: string) => (ALL_SECTIONS as string[]).includes(x))); })
      .catch(() => {});
  }, [userData]);

  // Onglet / section de publication toujours dans ce qui est permis
  useEffect(() => {
    if (!sections.length) return;
    if (sectionTab !== 'tout' && !sections.includes(sectionTab)) setSectionTab('tout');
    if (!sections.includes(publishSection)) setPublishSection(sections[0]);
  }, [sections]);

  const visibleSections: Section[] = useMemo(
    () => (sectionTab === 'tout' ? sections : sections.filter(x => x === sectionTab)),
    [sections, sectionTab]
  );
  // En publiant depuis un onglet précis, on publie dans cette section
  const targetSection: Section = sectionTab === 'tout' ? publishSection : sectionTab;

  // Load user
  useEffect(() => {
    const session = localStorage.getItem('session_user');
    if (!session) { navigate('/login'); return; }
    try {
      const parsed = JSON.parse(session);
      const user = parsed.userData || parsed;
      if (!user?.numeroH) { navigate('/login'); return; }
      setUserData(user);
      setLoading(false);
    } catch { navigate('/login'); }
  }, [navigate]);

  // Vérifier l'accès à la bibliothèque et charger le prix
  useEffect(() => {
    if (!userData) return;
    // Admin : accès à la bibliothèque sans abonnement
    if (isAdmin) setAAccesLivres(true);
    const token = localStorage.getItem('token');
    Promise.all([
      fetch(`${API_ORIGIN}/api/payment/acces-livres`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_ORIGIN}/api/payment/prix-livres`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([accesData, prixData]) => {
      if (accesData.aAcces) setAAccesLivres(true);
      if (prixData.an) setPrixLivres(prixData.an);
    }).catch(() => {});
  }, [userData]);

  // Charger les livres publiés
  const loadLivres = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_ORIGIN}/api/organizations/posts?category=livres_inspir`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setLivres((data.posts || []).reverse());
      }
    } catch { /* silencieux */ }
  };

  useEffect(() => {
    if (userData && aAccesLivres && view === 'bibliotheque' && biblioTab === 'livres') {
      loadLivres();
    }
  }, [userData, aAccesLivres, view, biblioTab]);

  // Acheter l'abonnement bibliothèque
  const acheterAbonnementLivres = () => {
    setShowLivresPayment(true);
  };

  // Publier un livre
  const handlePublierLivre = async () => {
    if (!livreTitre.trim() || !livreFile) {
      alert('Le titre et le fichier PDF sont obligatoires.');
      return;
    }
    setSendingLivre(true);
    try {
      const formData = new FormData();
      formData.append('content', `**${livreTitre}**\n\nAuteur : ${livreAuteur || (userData?.prenom + ' ' + userData?.nomFamille)}\n\n${livreDescription}`);
      formData.append('messageType', 'text');
      formData.append('category', 'livres_inspir');
      formData.append('subcategory', 'tous');
      formData.append('postCategory', 'livres');
      formData.append('media', livreFile);

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_ORIGIN}/api/organizations/create-post`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLivreTitre('');
          setLivreDescription('');
          setLivreAuteur('');
          setLivreFile(null);
          await loadLivres();
        } else {
          alert(data.message || 'Erreur lors de la publication.');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || `Erreur ${res.status}`);
      }
    } catch {
      alert('Erreur réseau.');
    } finally {
      setSendingLivre(false);
    }
  };

  // Load posts
  // « Tout » = toutes les sections permises réunies, du plus récent au plus ancien
  const loadPosts = async () => {
    if (!visibleSections.length) { setPosts([]); return; }
    try {
      const token = localStorage.getItem('token');
      const lists = await Promise.all(visibleSections.map(async section => {
        const res = await fetch(
          `${API_ORIGIN}/api/organizations/posts?category=inspir&subcategory=${section}`,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.posts || []).map((p: any) => ({ ...p, section: p.section || section }));
      }));
      setPosts(lists.flat().sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch { /* silencieux */ }
  };

  useEffect(() => {
    if (userData && visibleSections.length) {
      loadPosts();
      const iv = setInterval(() => {
        if (!document.hidden) loadPosts();
      }, 10000);
      return () => clearInterval(iv);
    }
  }, [visibleSections, userData]);

  // Audio recording avec timer 3 min
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      let seconds = 0;

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setMediaFile(new File([blob], 'audio.webm', { type: 'audio/webm' }));
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setAudioTimer(0);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioTimer(0);

      // Stop auto à 3 min (180s)
      timerRef.current = setInterval(() => {
        seconds++;
        setAudioTimer(seconds);
        if (seconds >= 180) {
          recorder.stop();
          setIsRecording(false);
          setMediaRecorder(null);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 1000);
    } catch {
      alert("Impossible d'accéder au microphone. Vérifiez les permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Un seul choix de fichier : le type (photo, vidéo, audio) est reconnu tout seul
  const typeDuFichier = (f: File): MediaType | null =>
    f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : null;

  const choisirFichier = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const type = typeDuFichier(file);
    if (!type) { alert('Choisissez une photo, une vidéo ou un audio.'); return; }
    if (type === 'image') { setMediaFile(file); return; }
    const max = type === 'video' ? 10 : 180;
    const el = document.createElement(type === 'video' ? 'video' : 'audio');
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(el.src);
      if (isFinite(el.duration) && el.duration > max) {
        alert(type === 'video' ? 'La vidéo ne doit pas dépasser 10 secondes.' : "L'audio ne doit pas dépasser 3 minutes.");
        return;
      }
      setMediaFile(file);
    };
    el.onerror = () => setMediaFile(file);
    el.src = URL.createObjectURL(file);
  };

  const resetForm = () => {
    setContent('');
    setMediaFile(null);
    setIsRecording(false);
    setAudioTimer(0);
  };

  const handleSend = async (messageType: PostType) => {
    if (messageType === 'text' && !content.trim() && !mediaFile) return;
    if (messageType !== 'text' && !mediaFile) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('messageType', messageType);
      formData.append('category', 'inspir');
      formData.append('subcategory', targetSection);
      if (mediaFile) formData.append('media', mediaFile);

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_ORIGIN}/api/organizations/create-post`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) { resetForm(); setComposer(false); await loadPosts(); }
        else alert("Erreur lors de la publication.");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || `Erreur ${res.status}`);
      }
    } catch { alert("Erreur réseau. Vérifiez que le backend est démarré."); }
    finally { setSending(false); }
  };

  // Fil : vidéos + photos + audio ensemble (du plus récent au plus ancien)
  // Tout ensemble, comme sur YouTube : vidéos, photos et audio mélangés
  const feedPosts = posts.filter(p => ['video', 'audio', 'image'].includes(p.messageType));
  // Bibliothèque › Écrits & PDF
  const ecritsPosts = posts.filter(p => p.messageType === 'text');

  const openView = (v: View) => {
    setView(v);
    resetForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black text-gray-900">🤝 Inspir</h1>
            <p className="text-gray-500 text-xs">Le bien que l'on fait pour l'autre</p>
          </div>
          {view === 'fil' ? (
            <button onClick={() => openView('bibliotheque')}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>
              📚 Bibliothèque
            </button>
          ) : (
            <button onClick={() => openView('fil')}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm"
              style={{ background: 'linear-gradient(135deg,#2563eb,#1e40af)' }}>
              🎬 Vidéos & Photos
            </button>
          )}
        </div>
      </div>

      {/* ── Sections : Tout + celles ouvertes à la personne (comme la messagerie familiale) ── */}
      {sections.length > 1 && (
        <div className="bg-white border-b">
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex gap-2 py-2.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {(['tout', ...sections] as SectionTab[]).map(id => {
                const active = sectionTab === id;
                const label = id === 'tout' ? '💬 Tout' : `${SECTION_INFO[id].icon} ${SECTION_INFO[id].label}`;
                return (
                  <button key={id} onClick={() => { setSectionTab(id); resetForm(); }}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                      active ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">


        {/* ════════════ FIL : vidéos, photos et audio ensemble ════════════ */}
        {view === 'fil' && (
          <>
            {/* Publier : un seul bouton, qui ouvre la fenêtre de publication */}
            <div className="flex">
              <button onClick={() => { resetForm(); setComposer(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm text-white shadow-sm"
                style={{ background: 'linear-gradient(135deg,#2563eb,#1e40af)' }}>
                ＋ Publier
              </button>
            </div>

            {composer && (
            <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center" onClick={() => !sending && setComposer(false)}>
            <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Nouvelle publication{sectionTab !== 'tout' || sections.length === 1 ? <span className="font-normal text-gray-500"> · {SECTION_INFO[targetSection].pour.toLowerCase()}</span> : null}</h3>
                <button onClick={() => setComposer(false)} aria-label="Fermer" className="text-gray-400 text-2xl leading-none">×</button>
              </div>

              {sectionTab === 'tout' && sections.length > 1 && (
                <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {sections.map(sec => (
                    <button key={sec} onClick={() => setPublishSection(sec)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${publishSection === sec ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {SECTION_INFO[sec].icon} {SECTION_INFO[sec].label}
                    </button>
                  ))}
                </div>
              )}

              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="Ajouter une description…"
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />

              {mediaFile ? (
                <div className="space-y-2">
                  <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                    {typeDuFichier(mediaFile) === 'image' && <img src={URL.createObjectURL(mediaFile)} alt="" className="w-full object-contain" style={{ maxHeight: 260 }} />}
                    {typeDuFichier(mediaFile) === 'video' && <video src={URL.createObjectURL(mediaFile)} controls playsInline className="w-full" style={{ maxHeight: 260 }} />}
                    {typeDuFichier(mediaFile) === 'audio' && <audio src={URL.createObjectURL(mediaFile)} controls className="w-full p-2" />}
                  </div>
                  <button onClick={() => setMediaFile(null)} className="text-red-500 text-xs font-semibold">✕ Retirer</button>
                </div>
              ) : isRecording ? (
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                  <span className="text-red-700 text-sm font-bold">{formatTime(audioTimer)} / 03:00</span>
                  <button onClick={stopRecording} className="ml-auto px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold">⏹ Arrêter</button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col items-center gap-1 py-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer hover:bg-gray-50">
                    <span className="text-xl">🖼️</span>Galerie
                    <input type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={e => choisirFichier(e.target)} />
                  </label>
                  <label className="flex flex-col items-center gap-1 py-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer hover:bg-gray-50">
                    <span className="text-xl">🎥</span>Filmer
                    <input type="file" accept="video/*" capture="user" className="hidden" onChange={e => choisirFichier(e.target)} />
                  </label>
                  <button onClick={startRecording} className="flex flex-col items-center gap-1 py-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50">
                    <span className="text-xl">🎤</span>Voix
                  </button>
                </div>
              )}

              <button onClick={() => { const t = mediaFile && typeDuFichier(mediaFile); if (t) handleSend(t); }} disabled={sending || !mediaFile}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#2563eb,#1e40af)' }}>
                {sending ? 'Publication en cours...' : 'Publier'}
              </button>
            </div>
            </div>
            )}

            {/* Le fil : grand espace pour chaque vidéo / photo, sur toute la largeur du téléphone */}
            {feedPosts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <div className="text-4xl mb-3">🎬</div>
                <p className="text-gray-400 text-sm">Aucun contenu pour le moment.</p>
                <p className="text-gray-300 text-xs mt-1">Soyez le premier à publier !</p>
              </div>
            ) : (
              <div className="-mx-4 sm:mx-0 space-y-3" style={{ maxWidth: 'none' }}>
                {feedPosts.map(post => {
                  const mediaUrl = mediaSrc(post.mediaUrl);
                  const author = post.authorName || post.author || post.numeroH || 'Membre';
                  return (
                    <article key={post.id} className="bg-white sm:rounded-2xl border-y sm:border border-gray-100 shadow-sm overflow-hidden">
                      {/* Auteur */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {String(author)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{author}</p>
                          <p className="text-xs text-gray-400">
                            {formatPostDate(post.createdAt)}
                          </p>
                        </div>
                        {SECTION_INFO[post.section as Section] && (
                          <span className="flex-shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                            {SECTION_INFO[post.section as Section].icon} {SECTION_INFO[post.section as Section].pour}
                          </span>
                        )}
                      </div>

                      {post.content && (
                        <p className="px-4 pb-3 text-gray-800 text-[15px] leading-relaxed whitespace-pre-line">{post.content}</p>
                      )}

                      {/* Média en grand */}
                      {post.messageType === 'video' && mediaUrl && (
                        <div className="bg-black">
                          <video src={mediaUrl} controls playsInline preload="metadata"
                            className="block w-full aspect-video object-contain bg-black" style={{ maxHeight: '80vh' }} />
                        </div>
                      )}
                      {post.messageType === 'image' && mediaUrl && (
                        <div className="bg-gray-100">
                          <img src={mediaUrl} alt={post.content || 'Photo'} loading="lazy"
                            className="block w-full object-contain" style={{ maxHeight: '85vh' }} />
                        </div>
                      )}
                      {post.messageType === 'audio' && mediaUrl && (
                        <div className="px-4 pb-4">
                          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'linear-gradient(135deg,#eef2ff,#e0f2fe)' }}>
                            <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">🎵 Audio</div>
                            <audio src={mediaUrl} controls preload="metadata" className="w-full" />
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ════════════ BIBLIOTHÈQUE : livres + écrits & PDF ════════════ */}
        {view === 'bibliotheque' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1 grid grid-cols-2 gap-1">
              {([
                { id: 'livres', label: '📚 Livres' },
                { id: 'ecrits', label: '📄 Écrits & PDF' },
              ] as { id: BiblioTab; label: string }[]).map(t => (
                <button key={t.id} onClick={() => { setBiblioTab(t.id); resetForm(); }}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                    biblioTab === t.id ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Livres ── */}
            {biblioTab === 'livres' && (!aAccesLivres ? (
              /* Paywall bibliothèque */
              <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-8 text-center text-white">
                  <div className="text-5xl mb-3">📚</div>
                  <h2 className="text-2xl font-black mb-1">Bibliothèque Inspir</h2>
                  <p className="text-amber-100 text-sm">Des livres publiés par la communauté, pour vous</p>
                </div>
                <div className="p-6 text-center space-y-4">
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <p className="text-gray-700 text-sm leading-relaxed">
                      Accédez à tous les livres publiés par les membres de la communauté.
                      Vous pourrez aussi <strong>publier vos propres livres</strong> pour les partager avec la famille humaine.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-amber-600">{prixLivres.toLocaleString()} GNF</div>
                    <div className="text-gray-500 text-xs">par an</div>
                  </div>
                  <button
                    onClick={acheterAbonnementLivres}
                    disabled={achatLivresLoading}
                    className="w-full py-4 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>
                    {achatLivresLoading ? 'Redirection vers le paiement...' : `📚 S'abonner pour ${prixLivres.toLocaleString()} GNF/an`}
                  </button>
                  <p className="text-gray-400 text-xs">Paiement sécurisé · Orange Money · MTN MoMo · Carte</p>
                </div>
              </div>
            ) : (
              <>
                {/* Formulaire publication livre */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">📖 Publier un livre</h3>
                  <input
                    type="text"
                    value={livreTitre}
                    onChange={e => setLivreTitre(e.target.value)}
                    placeholder="Titre du livre *"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <input
                    type="text"
                    value={livreAuteur}
                    onChange={e => setLivreAuteur(e.target.value)}
                    placeholder={`Auteur (par défaut : ${userData?.prenom} ${userData?.nomFamille})`}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <textarea
                    value={livreDescription}
                    onChange={e => setLivreDescription(e.target.value)}
                    placeholder="Description courte du livre..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-amber-200 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-all">
                    {livreFile ? (
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 text-sm font-semibold">📄 {livreFile.name}</span>
                        <button onClick={e => { e.preventDefault(); setLivreFile(null); }} className="text-red-400 text-xs">✕</button>
                      </div>
                    ) : (
                      <>
                        <span className="text-3xl mb-1">📄</span>
                        <span className="text-sm font-semibold text-gray-600">Joindre le PDF du livre *</span>
                        <span className="text-xs text-gray-400">Fichier PDF uniquement</span>
                      </>
                    )}
                    <input type="file" accept=".pdf" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) setLivreFile(f); }} />
                  </label>
                  <button
                    onClick={handlePublierLivre}
                    disabled={sendingLivre || !livreTitre.trim() || !livreFile}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>
                    {sendingLivre ? 'Publication en cours...' : '📚 Publier le livre'}
                  </button>
                </div>

                {/* Liste des livres */}
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-700 text-sm px-1">📚 Livres disponibles ({livres.length})</h3>
                  {livres.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                      <div className="text-4xl mb-3">📚</div>
                      <p className="text-gray-400 text-sm">Aucun livre publié pour le moment.</p>
                      <p className="text-gray-300 text-xs mt-1">Soyez le premier à partager un livre !</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {livres.map(livre => {
                        const mediaUrl = mediaSrc(livre.mediaUrl);
                        const lines = (livre.content || '').split('\n');
                        const titre = lines[0]?.replace(/\*\*/g, '') || 'Sans titre';
                        const auteurLine = lines[1] || '';
                        const desc = lines.slice(3).join('\n');
                        return (
                          <div key={livre.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4 items-start">
                            <div className="text-4xl flex-shrink-0">📖</div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 text-sm">{titre}</h4>
                              <p className="text-xs text-amber-600 font-medium">{auteurLine.replace('Auteur : ', '')}</p>
                              {desc && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{desc}</p>}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {mediaUrl && (
                                  <a href={mediaUrl} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
                                    📥 Télécharger / Lire
                                  </a>
                                )}
                                <span className="text-xs text-gray-400">
                                  {new Date(livre.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ))}

            {/* ── Écrits & PDF ── */}
            {biblioTab === 'ecrits' && (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-gray-800 text-sm">📄 Publier un écrit ou un PDF</h3>
                  </div>
                  {sectionTab === 'tout' && sections.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                      {sections.map(sec => (
                        <button key={sec} onClick={() => setPublishSection(sec)}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${publishSection === sec ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {SECTION_INFO[sec].icon} {SECTION_INFO[sec].label}
                        </button>
                      ))}
                    </div>
                  )}
                  <textarea value={content} onChange={e => setContent(e.target.value)}
                    placeholder="Rédigez votre texte ou message ici..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-400">ou joindre un PDF :</span>
                    <input type="file" accept=".pdf"
                      onChange={e => { const f = e.target.files?.[0]; if (f) setMediaFile(f); }}
                      className="flex-1 min-w-0 text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50" />
                  </div>
                  {mediaFile && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                      <span className="text-amber-700 text-xs truncate">📄 {mediaFile.name}</span>
                      <button onClick={() => setMediaFile(null)} className="text-red-400 text-xs ml-auto">✕</button>
                    </div>
                  )}
                  <button onClick={() => handleSend('text')} disabled={sending || (!content.trim() && !mediaFile)}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>
                    {sending ? 'Publication en cours...' : '✦ Publier'}
                  </button>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-gray-700 text-sm px-1">📄 Écrits & PDF ({ecritsPosts.length})</h3>
                  {ecritsPosts.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                      <div className="text-4xl mb-3">📄</div>
                      <p className="text-gray-400 text-sm">Aucun écrit pour le moment.</p>
                      <p className="text-gray-300 text-xs mt-1">Soyez le premier à publier !</p>
                    </div>
                  ) : ecritsPosts.map(post => {
                    const mediaUrl = mediaSrc(post.mediaUrl);
                    const author = post.authorName || post.author || post.numeroH || 'Membre';
                    return (
                      <div key={post.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {String(author)[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{author}</p>
                            <p className="text-xs text-gray-400">{formatPostDate(post.createdAt)}</p>
                          </div>
                          {SECTION_INFO[post.section as Section] && (
                            <span className="flex-shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                              {SECTION_INFO[post.section as Section].icon} {SECTION_INFO[post.section as Section].pour}
                            </span>
                          )}
                        </div>
                        <div className="p-4">
                          {post.content && <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">{post.content}</p>}
                          {mediaUrl && (
                            <a href={mediaUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
                              📄 Lire / Télécharger le PDF
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {showLivresPayment && (
        <PaymentModal
          isOpen={showLivresPayment}
          onClose={() => setShowLivresPayment(false)}
          onSuccess={() => {
            setShowLivresPayment(false);
            setAAccesLivres(true);
          }}
          amount={prixLivres}
          currency="GNF"
          purpose="subscription_livres_an"
          description="Abonnement Bibliothèque Inspir — 1 an"
        />
      )}
    </div>
  );
}