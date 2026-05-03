import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../../config/api';
import { VideoRecorder } from '../../components/VideoRecorder';

const API_ORIGIN = (config.API_BASE_URL || '').replace(/\/api\/?$/, '') || 'http://localhost:5002';

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

type Audience = 'hommes' | 'femmes' | 'enfants';
type MediaTab = 'video' | 'audio' | 'image' | 'text';

const MEDIA_TABS: { id: MediaTab; label: string; icon: string; desc: string }[] = [
  { id: 'video', label: 'Vidéos', icon: '🎬', desc: 'max 1 minute' },
  { id: 'audio', label: 'Audio', icon: '🎵', desc: 'max 3 minutes' },
  { id: 'image', label: 'Photos', icon: '📷', desc: 'images' },
  { id: 'text', label: 'PDF & Écriture', icon: '📄', desc: 'texte ou PDF' },
];

const CATEGORIES = [
  { value: 'information', label: 'ℹ️ Information' },
  { value: 'rencontre', label: '🤝 Rencontre' },
  { value: 'opportunite', label: '🌟 Opportunité' },
  { value: 'outil', label: '🛠️ Outil de travail' },
  { value: 'reunion', label: '👥 Réunion' },
];

const getCategoryLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label || 'ℹ️ Information';

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
  const [audienceTab, setAudienceTab] = useState<Audience>('hommes');
  const [mediaTab, setMediaTab] = useState<MediaTab>('video');
  const [posts, setPosts] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  // Form state
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('information');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [videoMode, setVideoMode] = useState<'record' | 'upload'>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [audioTimer, setAudioTimer] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = userData?.role === 'admin' || userData?.role === 'Admin' || userData?.role === 'ADMIN';

  const autoAudience = (): Audience => {
    if (!userData) return 'hommes';
    const age = calculateAge(userData.dateNaissance || userData.date_naissance);
    if (age !== null && age < 18) return 'enfants';
    const g = userData.genre?.toUpperCase();
    if (g === 'FEMME' || g === 'F' || g === 'FEMININ' || g === 'FEMALE') return 'femmes';
    return 'hommes';
  };

  const currentAudience: Audience = useMemo(() => {
    return isAdmin ? audienceTab : autoAudience();
  }, [userData, isAdmin, audienceTab]);

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

  // Load posts
  const loadPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_ORIGIN}/api/organizations/posts?category=demographie&subcategory=${currentAudience}`,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        setPosts((data.posts || []).reverse());
      }
    } catch { /* silencieux */ }
  };

  useEffect(() => {
    if (userData) {
      loadPosts();
      const iv = setInterval(() => {
        if (!document.hidden) loadPosts();
      }, 10000);
      return () => clearInterval(iv);
    }
  }, [currentAudience, userData, mediaTab]);

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

  const resetForm = () => {
    setContent('');
    setMediaFile(null);
    setCategory('information');
    setIsRecording(false);
    setAudioTimer(0);
  };

  const handleSend = async () => {
    if (mediaTab === 'text' && !content.trim() && !mediaFile) return;
    if (mediaTab !== 'text' && !mediaFile) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('messageType', mediaTab);
      formData.append('category', 'demographie');
      formData.append('subcategory', currentAudience);
      formData.append('postCategory', category);
      if (mediaFile) formData.append('media', mediaFile);

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_ORIGIN}/api/organizations/create-post`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) { resetForm(); await loadPosts(); }
        else alert("Erreur lors de la publication.");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || `Erreur ${res.status}`);
      }
    } catch { alert("Erreur réseau. Vérifiez que le backend est démarré."); }
    finally { setSending(false); }
  };

  // Filtrer les posts par type de media actif
  const filteredPosts = posts.filter(p => p.messageType === mediaTab);

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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 transition-colors">
            ← Retour
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900">🤝 Inspir</h1>
            <p className="text-gray-500 text-xs">
              {currentAudience === 'hommes' ? 'Section Hommes' : currentAudience === 'femmes' ? 'Section Femmes' : 'Section Enfants (- 18 ans)'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Onglets audience (admin seulement) ── */}
      {isAdmin && (
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex gap-1 py-2">
              {([
                { id: 'hommes', label: '👨 Hommes' },
                { id: 'femmes', label: '👩 Femmes' },
                { id: 'enfants', label: '🧒 Enfants' },
              ] as { id: Audience; label: string }[]).map(t => (
                <button key={t.id} onClick={() => setAudienceTab(t.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    audienceTab === t.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* ── Onglets type de média ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-4 divide-x divide-gray-100">
            {MEDIA_TABS.map(tab => (
              <button key={tab.id} onClick={() => { setMediaTab(tab.id); resetForm(); }}
                className={`flex flex-col items-center py-4 px-2 transition-all ${
                  mediaTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}>
                <span className="text-2xl mb-1">{tab.icon}</span>
                <span className="text-xs font-bold">{tab.label}</span>
                <span className="text-[10px] text-gray-400">{tab.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Zone publication ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              {MEDIA_TABS.find(t => t.id === mediaTab)?.icon} Publier une {MEDIA_TABS.find(t => t.id === mediaTab)?.label.slice(0, -1) || 'publication'}
            </h3>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-700">
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {/* Vidéo */}
          {mediaTab === 'video' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button onClick={() => { setVideoMode('record'); setMediaFile(null); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${videoMode === 'record' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  🎥 Enregistrer
                </button>
                <button onClick={() => { setVideoMode('upload'); setMediaFile(null); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${videoMode === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  📂 Importer
                </button>
              </div>
              {videoMode === 'record' ? (
                mediaFile ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
                    <span className="text-green-700 text-sm font-semibold">✅ Vidéo prête</span>
                    <button onClick={() => setMediaFile(null)} className="text-red-400 text-xs ml-auto">✕ Refaire</button>
                  </div>
                ) : (
                  <VideoRecorder maxDuration={10}
                    onVideoRecorded={blob => setMediaFile(new File([blob], `video-${Date.now()}.webm`, { type: blob.type || 'video/webm' }))} />
                )
              ) : (
                <input type="file" accept="video/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const vid = document.createElement('video');
                    vid.preload = 'metadata';
                    vid.onloadedmetadata = () => {
                      URL.revokeObjectURL(vid.src);
                      if (vid.duration > 10) { alert('La vidéo ne doit pas dépasser 10 secondes.'); e.target.value = ''; return; }
                      setMediaFile(file);
                    };
                    vid.src = URL.createObjectURL(file);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"
                />
              )}
            </div>
          )}

          {/* Audio */}
          {mediaTab === 'audio' && (
            <div className="space-y-2">
              {!isRecording && !mediaFile ? (
                <div className="flex gap-2 items-center">
                  <button onClick={startRecording}
                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors flex items-center gap-2">
                    🎤 Enregistrer (max 3 min)
                  </button>
                  <span className="text-gray-400 text-xs">ou</span>
                  <input type="file" accept="audio/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const audio = new Audio();
                      audio.onloadedmetadata = () => {
                        if (audio.duration > 180) { alert("L'audio ne doit pas dépasser 3 minutes."); e.target.value = ''; return; }
                        setMediaFile(file);
                      };
                      audio.src = URL.createObjectURL(file);
                    }}
                    className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50"
                  />
                </div>
              ) : isRecording ? (
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                  <span className="text-red-700 text-sm font-bold">Enregistrement : {formatTime(audioTimer)} / 03:00</span>
                  <div className="flex-1 bg-red-200 rounded-full h-1.5">
                    <div className="bg-red-500 h-1.5 rounded-full transition-all" style={{ width: `${(audioTimer / 180) * 100}%` }} />
                  </div>
                  <button onClick={stopRecording}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700">
                    ⏹ Arrêter
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
                  <span className="text-green-700 text-sm font-semibold">✅ Audio prêt</span>
                  <button onClick={() => setMediaFile(null)} className="text-red-400 text-xs ml-auto">✕ Refaire</button>
                </div>
              )}
            </div>
          )}

          {/* Photo */}
          {mediaTab === 'image' && (
            <div>
              {mediaFile ? (
                <div className="space-y-2">
                  <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ maxHeight: 220 }}>
                    <img src={URL.createObjectURL(mediaFile)} alt="Aperçu" className="w-full object-contain" style={{ maxHeight: 220 }} />
                  </div>
                  <button onClick={() => setMediaFile(null)} className="text-red-400 text-xs">✕ Changer la photo</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                  <span className="text-4xl mb-2">📷</span>
                  <span className="text-sm font-semibold text-gray-600">Cliquez pour choisir une photo</span>
                  <span className="text-xs text-gray-400">JPG, PNG, GIF, WEBP</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) setMediaFile(f); }} />
                </label>
              )}
            </div>
          )}

          {/* PDF / Texte */}
          {mediaTab === 'text' && (
            <div className="space-y-2">
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="Rédigez votre texte ou message ici..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">ou joindre un PDF :</span>
                <input type="file" accept=".pdf"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setMediaFile(f); }}
                  className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50" />
              </div>
              {mediaFile && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="text-blue-700 text-xs">📄 {mediaFile.name}</span>
                  <button onClick={() => setMediaFile(null)} className="text-red-400 text-xs ml-auto">✕</button>
                </div>
              )}
            </div>
          )}

          {/* Bouton publier */}
          <button onClick={handleSend} disabled={sending ||
            (mediaTab === 'text' ? (!content.trim() && !mediaFile) : !mediaFile)}
            className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#2563eb,#1e40af)' }}>
            {sending ? 'Publication en cours...' : '✦ Publier'}
          </button>
        </div>

        {/* ── Liste des posts ── */}
        <div className="space-y-3">
          <h3 className="font-bold text-gray-700 text-sm px-1">
            {MEDIA_TABS.find(t => t.id === mediaTab)?.icon} {MEDIA_TABS.find(t => t.id === mediaTab)?.label} publiées ({filteredPosts.length})
          </h3>

          {filteredPosts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <div className="text-4xl mb-3">{MEDIA_TABS.find(t => t.id === mediaTab)?.icon}</div>
              <p className="text-gray-400 text-sm">Aucun contenu pour le moment.</p>
              <p className="text-gray-300 text-xs mt-1">Soyez le premier à publier !</p>
            </div>
          ) : (
            <div className={mediaTab === 'image'
              ? 'grid grid-cols-2 sm:grid-cols-3 gap-3'
              : 'space-y-3'}>
              {filteredPosts.map(post => {
                const mediaUrl = post.mediaUrl ? `${API_ORIGIN}${post.mediaUrl}` : null;
                return (
                  <div key={post.id}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

                    {/* En-tête post */}
                    {mediaTab !== 'image' && (
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(post.authorName || post.author || 'U')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{post.authorName || post.author || post.numeroH}</p>
                          <p className="text-xs text-gray-400">{getCategoryLabel(post.postCategory || post.category || 'information')}</p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(post.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    {/* Contenu */}
                    <div className={mediaTab === 'image' ? '' : 'p-4'}>
                      {mediaTab === 'video' && mediaUrl && (
                        <video src={mediaUrl} controls className="w-full rounded-xl" style={{ maxHeight: 300 }} />
                      )}
                      {mediaTab === 'audio' && mediaUrl && (
                        <audio src={mediaUrl} controls className="w-full" />
                      )}
                      {mediaTab === 'image' && mediaUrl && (
                        <div className="relative" style={{ paddingTop: '75%' }}>
                          <img src={mediaUrl} alt="Photo"
                            className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 px-2 py-1">
                            <p className="text-white text-[10px] truncate">{post.authorName || post.autor || ''}</p>
                          </div>
                        </div>
                      )}
                      {mediaTab === 'text' && (
                        <div>
                          {post.content && <p className="text-gray-800 text-sm leading-relaxed">{post.content}</p>}
                          {mediaUrl && (
                            <a href={mediaUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                              📄 Télécharger le PDF
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}