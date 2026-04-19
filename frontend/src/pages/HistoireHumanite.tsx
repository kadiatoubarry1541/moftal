import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface WitnessProfile {
  numeroH: string;
  name: string;
  age: number | null;
  testimoniedAt: string;
}

interface PublishedStory {
  id: number;
  numeroH: string;
  authorName: string;
  sectionId: string;
  sectionTitle: string;
  content: string;
  photos: string[];
  videos: string[];
  generation: string | null;
  region: string | null;
  country: string | null;
  publishedAt: string;
  views: number;
  likes: number;
  witnesses: WitnessProfile[];
}

const sectionIcons: Record<string, string> = {
  'naissance': '👶',
  'jeunesse': '🌱',
  'mariage': '💍',
  'revelation': '✨',
  'persecution': '🛡️',
  'unification': '🏆',
  'heritage': '📜'
};

export default function HistoireHumanite() {
  const [stories, setStories] = useState<PublishedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedGeneration, setSelectedGeneration] = useState<string>('all');
  const [stats, setStats] = useState<any>(null);
  const [currentUserNumeroH, setCurrentUserNumeroH] = useState<string | null>(null);
  const [testifyingId, setTestifyingId] = useState<number | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();

  const sections = [
    { id: 'all', title: 'Toutes les sections', icon: '📚' },
    { id: 'naissance', title: 'Naissance et Enfance', icon: '👶' },
    { id: 'jeunesse', title: 'Jeunesse et Apprentissage', icon: '🌱' },
    { id: 'mariage', title: 'Union et Engagement', icon: '💍' },
    { id: 'revelation', title: 'Réalisation et Mission', icon: '✨' },
    { id: 'persecution', title: 'Épreuves et Résilience', icon: '🛡️' },
    { id: 'unification', title: 'Réalisation et Unification', icon: '🏆' },
    { id: 'heritage', title: 'Héritage et Transmission', icon: '📜' }
  ];

  useEffect(() => {
    const session = localStorage.getItem("session_user");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        const user = parsed.userData || parsed;
        if (user?.numeroH) setCurrentUserNumeroH(user.numeroH);
      } catch {}
    }
    // Charger l'historique des recherches
    try {
      const saved = localStorage.getItem('histoire_search_history');
      if (saved) setSearchHistory(JSON.parse(saved));
    } catch {}
    loadStories();
    loadStats();
  }, [selectedSection, selectedGeneration, searchTerm]);

  const saveSearchToHistory = (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...searchHistory.filter(h => h !== term)].slice(0, 8);
    setSearchHistory(updated);
    localStorage.setItem('histoire_search_history', JSON.stringify(updated));
  };

  const loadStories = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSection !== 'all') params.append('sectionId', selectedSection);
      if (selectedGeneration !== 'all') params.append('generation', selectedGeneration);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/user-stories/published?${params.toString()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des histoires:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/user-stories/published/stats`
      );
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const handleTestify = async (storyId: number) => {
    if (!currentUserNumeroH) {
      toast.error('Connectez-vous pour témoigner');
      navigate('/login');
      return;
    }
    setTestifyingId(storyId);
    try {
      const session = localStorage.getItem("session_user");
      const token = session ? JSON.parse(session).token : null;
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/user-stories/testify/${storyId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        }
      );
      const data = await response.json();
      if (response.ok) {
        toast.success('Votre témoignage a été enregistré !');
        setStories(prev => prev.map(s =>
          s.id === storyId ? { ...s, witnesses: data.witnesses } : s
        ));
      } else {
        toast.error(data.message || 'Erreur lors du témoignage');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setTestifyingId(null);
    }
  };

  const filteredStories = stories.filter(story => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        story.content.toLowerCase().includes(searchLower) ||
        story.authorName.toLowerCase().includes(searchLower) ||
        story.sectionTitle.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div>
              <h1 className="text-5xl font-bold text-white mb-3">📚 Histoire de l'Humanité</h1>
              <p className="text-blue-100 text-xl">
                Les histoires partagées par les Enfants d'Adam - Un patrimoine collectif pour les générations futures
              </p>
              {stats && (
                <div className="mt-4 flex gap-6 text-blue-100">
                  <div>
                    <span className="font-semibold text-2xl">{stats.totalStories}</span>
                    <span className="ml-2">histoires publiées</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/a-retenir')}
                className="bg-white text-indigo-700 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
              >
                ✍️ Partager mon histoire
              </button>
              <button
                onClick={() => navigate('/moi')}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg"
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">🔍 Rechercher</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowHistory(true)}
                onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim()) {
                    saveSearchToHistory(searchTerm.trim());
                    setShowHistory(false);
                  }
                }}
                placeholder="Rechercher dans les histoires..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {showHistory && searchHistory.length > 0 && !searchTerm && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 overflow-hidden">
                  <p className="text-xs font-semibold text-gray-400 px-3 pt-2 pb-1">Recherches récentes</p>
                  {searchHistory.map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => { setSearchTerm(h); setShowHistory(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 flex items-center gap-2"
                    >
                      <span className="text-gray-400">🕐</span> {h}
                    </button>
                  ))}
                  <button
                    type="button"
                    onMouseDown={() => { setSearchHistory([]); localStorage.removeItem('histoire_search_history'); }}
                    className="w-full text-center px-3 py-2 text-xs text-red-400 hover:text-red-600 border-t"
                  >
                    Effacer l'historique
                  </button>
                </div>
              )}
            </div>

            {/* Section Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">📖 Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {sections.map(section => (
                  <option key={section.id} value={section.id}>
                    {section.icon} {section.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Generation Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">👥 Génération</label>
              <select
                value={selectedGeneration}
                onChange={(e) => setSelectedGeneration(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Toutes les générations</option>
                {Array.from({ length: 96 }, (_, i) => i + 1).map(gen => (
                  <option key={gen} value={`G${gen}`}>Génération {gen}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Chargement des histoires...</div>
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg">
            <div className="text-6xl mb-4">📖</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucune histoire trouvée</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedSection !== 'all' || selectedGeneration !== 'all'
                ? 'Essayez de modifier vos critères de recherche'
                : 'Soyez le premier à partager votre histoire dans l\'Histoire de l\'Humanité !'}
            </p>
            <button
              onClick={() => navigate('/a-retenir')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              ✍️ Partager mon histoire
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredStories.map((story) => (
              <div
                key={story.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-300"
              >
                {/* Story Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-4xl">{sectionIcons[story.sectionId] || '📖'}</div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{story.sectionTitle}</h3>
                        <p className="text-indigo-100 text-sm mt-1">
                          Par {story.authorName}
                          {story.generation && ` • ${story.generation}`}
                          {story.region && ` • ${story.region}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-white text-sm">
                      <div className="text-xs text-indigo-100">Publié le</div>
                      <div>{new Date(story.publishedAt).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                </div>

                {/* Story Content */}
                <div className="p-6">
                  <div className="prose max-w-none mb-4">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {story.content.length > 500 
                        ? `${story.content.substring(0, 500)}...` 
                        : story.content}
                    </p>
                  </div>

                  {/* Photos */}
                  {story.photos && story.photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {story.photos.slice(0, 4).map((photo, index) => (
                        <img
                          key={index}
                          src={`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}${photo}`}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.src = photo.startsWith('http') ? photo : `${import.meta.env.VITE_API_URL || 'http://localhost:5002'}${photo}`;
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Videos */}
                  {story.videos && story.videos.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {story.videos.map((video, index) => (
                        <video
                          key={index}
                          src={`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}${video}`}
                          controls
                          className="w-full rounded-lg"
                          onError={(e) => {
                            e.currentTarget.src = video.startsWith('http') ? video : `${import.meta.env.VITE_API_URL || 'http://localhost:5002'}${video}`;
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Témoins — 4 slots toujours visibles */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🤝 Témoins</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(story.witnesses?.length || 0) >= 4 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {story.witnesses?.length || 0}/4
                        </span>
                        {currentUserNumeroH && currentUserNumeroH !== story.numeroH && (
                          !(story.witnesses || []).some(w => w.numeroH === currentUserNumeroH) &&
                          (story.witnesses?.length || 0) < 4 ? (
                            <button
                              onClick={() => handleTestify(story.id)}
                              disabled={testifyingId === story.id}
                              className="ml-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-full transition-colors disabled:opacity-50"
                            >
                              {testifyingId === story.id ? '⏳...' : '✋ Témoigner'}
                            </button>
                          ) : (story.witnesses || []).some(w => w.numeroH === currentUserNumeroH) ? (
                            <span className="ml-1 text-xs text-green-600 font-semibold">✅ Témoigné</span>
                          ) : null
                        )}
                      </div>
                    </div>
                    {/* 4 slots de témoins toujours affichés */}
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: 4 }, (_, i) => {
                        const w = (story.witnesses || [])[i];
                        return (
                          <div key={i} className={`rounded-lg px-3 py-2 border text-xs flex items-center gap-2 ${w ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-dashed border-gray-200'}`}>
                            {w ? (
                              <>
                                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                                  {w.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-indigo-900 truncate">{w.name}</p>
                                  {w.age && <p className="text-gray-400">{w.age} ans</p>}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0 text-base">
                                  ?
                                </div>
                                <p className="text-gray-400 italic">Témoin {i + 1}</p>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>👁️ {story.views} vues</span>
                    </div>
                    {story.content.length > 500 && (
                      <button className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm">
                        Lire la suite →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
