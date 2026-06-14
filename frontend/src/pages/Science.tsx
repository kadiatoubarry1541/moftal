import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuickMediaCapture } from '../components/QuickMediaCapture';
import ProSection from '../components/ProSection';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  role?: string;
  [key: string]: any;
}

interface SciencePost {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  category: 'recentes' | 'recherches' | 'anciens';
  author: string;
  authorName: string;
  likes: string[];
  comments: ScienceComment[];
  createdAt: string;
}

interface ScienceComment {
  id: string;
  author: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export default function Science() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'recentes' | 'recherches' | 'anciens'>('recentes');
  const [posts, setPosts] = useState<SciencePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showMediaCapture, setShowMediaCapture] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [newPermission, setNewPermission] = useState({
    numeroH: '',
    expiresAt: '',
    notes: ''
  });
  const navigate = useNavigate();

  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    type: 'text' as 'text' | 'image' | 'video' | 'audio'
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
      // Vérifier d'abord si admin, puis les permissions
      const isAdmin = checkAdminStatus(user);
      if (!isAdmin) {
        checkPermission(user);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la session:', error);
      navigate("/login");
    }
  }, [navigate]);

  const checkAdminStatus = (user: UserData) => {
    const isAdminUser = user.role === 'admin' || user.role === 'super-admin' || user.numeroH === 'G0C0P0R0E0F0 0';
    setIsAdmin(isAdminUser);
    // L'admin a toujours la permission de publier
    if (isAdminUser) {
      setHasPermission(true);
      return true; // Retourner true si admin
    }
    return false; // Retourner false si pas admin
  };

  const checkPermission = async (user: UserData) => {
    // Ne pas vérifier si l'utilisateur est admin (déjà géré dans checkAdminStatus)
    const isAdminUser = user.role === 'admin' || user.role === 'super-admin' || user.numeroH === 'G0C0P0R0E0F0 0';
    if (isAdminUser) {
      return; // L'admin a déjà la permission, pas besoin de vérifier
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/science/my-permission', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasPermission(data.hasPermission || false);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la permission:', error);
    }
  };

  const grantPermission = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/science/permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numeroH: newPermission.numeroH,
          expiresAt: newPermission.expiresAt || null,
          notes: newPermission.notes
        })
      });
      
      if (response.ok) {
        alert('Permission accordée avec succès !');
        setShowPermissionForm(false);
        setNewPermission({
          numeroH: '',
          expiresAt: '',
          notes: ''
        });
      } else {
        const data = await response.json();
        alert(data.message || 'Erreur lors de l\'octroi de permission');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'octroi de permission');
    }
  };

  useEffect(() => {
    if (userData) {
      loadPosts();
    }
  }, [userData, activeTab]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/science/posts?category=${activeTab}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          setPosts(data.posts || []);
        } else {
          setPosts(getDefaultPosts());
        }
      } else {
        setPosts(getDefaultPosts());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des posts:', error);
      setPosts(getDefaultPosts());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPosts = (): SciencePost[] => {
    const authors = [
      { numeroH: 'USER001', name: 'Dr. Alpha Diallo' },
      { numeroH: 'USER002', name: 'Mme Fatou Camara' },
      { numeroH: 'USER003', name: 'Dr. Mamadou Bah' },
      { numeroH: 'USER004', name: 'M. Ousmane Barry' }
    ];

    const now = new Date();
    const randomDate = (daysAgo: number) => new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    const defaultData: { [key: string]: SciencePost[] } = {
      recentes: [
        {
          id: '1',
          title: 'Découverte scientifique récente',
          content: 'Notre équipe de recherche vient de publier une étude révolutionnaire sur les énergies renouvelables en Afrique. Les résultats montrent un potentiel énorme pour l\'autonomie énergétique.',
          type: 'text',
          category: 'recentes',
          author: authors[0].numeroH,
          authorName: authors[0].name,
          likes: ['USER002', 'USER003'],
          comments: [],
          createdAt: randomDate(1)
        },
        {
          id: '2',
          title: 'Conférence internationale de science',
          content: 'Une grande conférence internationale sur les sciences africaines aura lieu ce mois-ci. Plusieurs chercheurs renommés seront présents pour partager leurs découvertes.',
          type: 'text',
          category: 'recentes',
          author: authors[1].numeroH,
          authorName: authors[1].name,
          likes: ['USER001', 'USER004'],
          comments: [],
          createdAt: randomDate(2)
        }
      ],
      recherches: [
        {
          id: '3',
          title: 'Recherche sur la médecine traditionnelle',
          content: 'Mes recherches portent sur la médecine traditionnelle africaine et son intégration avec la médecine moderne. Les résultats préliminaires sont très prometteurs pour le traitement de certaines maladies.',
          type: 'text',
          category: 'recherches',
          author: authors[2].numeroH,
          authorName: authors[2].name,
          likes: ['USER001', 'USER002', 'USER004'],
          comments: [],
          createdAt: randomDate(10)
        },
        {
          id: '4',
          title: 'Étude sur l\'agriculture durable',
          content: 'J\'ai récemment terminé une étude sur l\'agriculture durable en Guinée. Les pratiques traditionnelles combinées avec les techniques modernes offrent des solutions prometteuses.',
          type: 'text',
          category: 'recherches',
          author: authors[0].numeroH,
          authorName: authors[0].name,
          likes: ['USER003', 'USER004'],
          comments: [],
          createdAt: randomDate(15)
        }
      ],
      anciens: [
        {
          id: '5',
          title: 'Savoirs anciens en science',
          content: 'Les anciens scientifiques africains avaient développé des connaissances remarquables en astronomie, médecine et mathématiques. Ces savoirs continuent d\'inspirer les recherches modernes.',
          type: 'text',
          category: 'anciens',
          author: authors[3].numeroH,
          authorName: authors[3].name,
          likes: ['USER001', 'USER002'],
          comments: [],
          createdAt: randomDate(30)
        },
        {
          id: '6',
          title: 'Histoire des sciences africaines',
          content: 'Un documentaire a été réalisé sur l\'histoire des sciences africaines et leurs contributions méconnues aux connaissances scientifiques mondiales. Il montre la richesse du patrimoine scientifique africain.',
          type: 'text',
          category: 'anciens',
          author: authors[1].numeroH,
          authorName: authors[1].name,
          likes: ['USER003', 'USER004'],
          comments: [],
          createdAt: randomDate(45)
        }
      ]
    };

    return defaultData[activeTab] || [];
  };

  const handleCreatePost = () => {
    setNewPost({
      title: '',
      content: '',
      type: 'text'
    });
    setSelectedFile(null);
    setShowCreatePost(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log('Fichier sélectionné:', file.name, 'Type:', file.type, 'Taille:', file.size);
      
      // Vérifier la taille du fichier (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        alert(`Le fichier est trop volumineux. Taille maximale: 100MB. Votre fichier: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        e.target.value = ''; // Réinitialiser l'input
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const submitCreatePost = async (mediaFile?: File) => {
    const fileToUse = mediaFile || selectedFile;
    
    // Validation améliorée
    if (newPost.type === 'text' && !newPost.title && !newPost.content) {
      alert('Veuillez remplir au moins le titre ou le contenu pour un post texte');
      return;
    }
    
    if ((newPost.type === 'image' || newPost.type === 'video' || newPost.type === 'audio') && !fileToUse) {
      alert(`Veuillez sélectionner ou capturer un fichier ${newPost.type === 'image' ? 'photo' : newPost.type === 'video' ? 'vidéo' : 'audio'}`);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert('Vous devez être connecté pour publier');
        return;
      }
      
      const formData = new FormData();
      formData.append('title', newPost.title || 'Sans titre');
      formData.append('content', newPost.content || '');
      formData.append('type', newPost.type);
      formData.append('category', activeTab);
      formData.append('author', userData?.numeroH || '');
      formData.append('authorName', `${userData?.prenom} ${userData?.nomFamille}`);

      if (fileToUse) {
        formData.append('media', fileToUse);
        console.log('Fichier ajouté:', fileToUse.name, 'Type:', fileToUse.type, 'Taille:', fileToUse.size);
      } else {
        console.log('Aucun fichier à envoyer');
      }

      console.log('Envoi du post:', {
        title: newPost.title,
        type: newPost.type,
        category: activeTab,
        hasFile: !!fileToUse
      });

      const response = await fetch('/api/science/create-post', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const responseData = await response.json();

      if (response.ok) {
        alert('Post créé avec succès !');
        setShowCreatePost(false);
        setShowMediaCapture(false);
        setSelectedFile(null);
        setNewPost({ title: '', content: '', type: 'text' });
        loadPosts();
      } else {
        console.error('Erreur réponse:', responseData);
        alert(responseData.message || 'Erreur lors de la création du post');
      }
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      alert(`Erreur lors de la création du post: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const handleMediaCapture = (file: File, type: 'photo' | 'video' | 'audio') => {
    const postType = type === 'photo' ? 'image' : type;
    setNewPost({ ...newPost, type: postType as any });
    setSelectedFile(file);
    submitCreatePost(file);
  };

  const getTabLabel = (tab: string) => {
    const labels: { [key: string]: { title: string; icon: string; description: string } } = {
      'recentes': { title: 'Récentes', icon: '🆕', description: 'Publications et découvertes récentes' },
      'recherches': { title: 'Nos recherches', icon: '🔍', description: 'Études et investigations en cours' },
      'anciens': { title: 'Les anciens', icon: '👴', description: 'Savoirs scientifiques des anciens' }
    };
    return labels[tab] || { title: tab, icon: '📝', description: '' };
  };

  // isAdmin et hasPermission sont maintenant dans le state

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de la science...</p>
        </div>
      </div>
    );
  }

  const tabInfo = getTabLabel(activeTab);
  const filteredPosts = posts;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">⚛️ Science</h1>
              <p className="mt-2 text-gray-600">Explorez et contribuez aux sciences</p>
            </div>
            <div className="flex space-x-4 items-center">
              {hasPermission && (
                <button
                  onClick={handleCreatePost}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  ➕ Nouveau Post
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowPermissionForm(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  🔐 Accorder une permission
                </button>
              )}
              {!hasPermission && !isAdmin && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ Vous n'avez pas la permission de publier
                  </p>
                </div>
              )}
              <button
                onClick={() => navigate('/moi')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1 py-2">
            {[
              { id: 'recentes', label: 'Récentes', icon: '🆕' },
              { id: 'recherches', label: 'Nos recherches', icon: '🔍' },
              { id: 'anciens', label: 'Les anciens', icon: '👴' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center justify-center gap-1 px-2 py-2 sm:px-4 sm:py-3 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="text-base sm:text-lg">{tab.icon}</span>
                <span className="text-center leading-tight">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <span className="text-4xl mr-3">{tabInfo.icon}</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {tabInfo.title}
                </h2>
                <p className="text-gray-600">{tabInfo.description}</p>
              </div>
            </div>

            {filteredPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.map((post) => (
                  <div key={post.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200">
                    {/* Image en haut pour les posts image */}
                    {post.type === 'image' && post.mediaUrl && (
                      <div className="w-full h-48 overflow-hidden bg-gray-100">
                        <img 
                          src={post.mediaUrl} 
                          alt={post.title} 
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    
                    {/* Contenu de la carte */}
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">{post.title}</h3>
                          <p className="text-xs text-gray-500 mb-2">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${
                          post.type === 'video' ? 'bg-red-100 text-red-800' :
                          post.type === 'audio' ? 'bg-green-100 text-green-800' :
                          post.type === 'image' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {post.type === 'video' ? '🎥' :
                           post.type === 'audio' ? '🎵' :
                           post.type === 'image' ? '📷' : '💬'}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-3 line-clamp-3">{post.content}</p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <span>👤</span>
                          <span className="truncate">{post.authorName}</span>
                        </span>
                      </div>

                      {/* Vidéo et Audio */}
                      {post.type === 'video' && post.mediaUrl && (
                        <div className="mb-4 rounded-lg overflow-hidden">
                          <video controls className="w-full rounded-lg">
                            <source src={post.mediaUrl} type="video/mp4" />
                          </video>
                        </div>
                      )}
                      {post.type === 'audio' && post.mediaUrl && (
                        <div className="mb-4">
                          <audio controls className="w-full">
                            <source src={post.mediaUrl} type="audio/mpeg" />
                          </audio>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center space-x-4">
                          <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors">
                            <span>👍</span>
                            <span className="text-xs">{post.likes.length}</span>
                          </button>
                          <button className="flex items-center space-x-1 text-gray-600 hover:text-green-600 transition-colors">
                            <span>💬</span>
                            <span className="text-xs">{post.comments.length}</span>
                          </button>
                        </div>
                        <button className="flex items-center space-x-1 text-gray-600 hover:text-purple-600 transition-colors text-xs">
                          <span>📤</span>
                          <span>Partager</span>
                        </button>
                      </div>

                      {/* Commentaires (affichage réduit) */}
                      {post.comments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <button className="text-xs text-blue-600 hover:text-blue-800">
                            Voir {post.comments.length} commentaire{post.comments.length > 1 ? 's' : ''} →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">{tabInfo.icon}</div>
                <p className="text-gray-500 text-lg mb-4">Aucun post dans cette section</p>
                {hasPermission && (
                  <button
                    onClick={handleCreatePost}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Créer le premier post
                  </button>
                )}
                {!hasPermission && !isAdmin && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ Vous n'avez pas la permission de publier. Contactez un administrateur pour obtenir l'autorisation.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de création de post */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
              📝 Nouveau Post - {tabInfo.title}
            </h3>
              <button
                onClick={() => {
                  setShowCreatePost(false);
                  setShowMediaCapture(false);
                  setSelectedFile(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre du post *
                </label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Titre de votre post scientifique..."
                />
              </div>

              {/* Sélection du type de contenu avec cartes visuelles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Type de contenu *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    type="button"
                    onClick={() => setNewPost({...newPost, type: 'text'})}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      newPost.type === 'text'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-3xl mb-2">💬</div>
                    <div className="font-semibold text-sm">Texte</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPost({...newPost, type: 'image'})}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      newPost.type === 'image'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-3xl mb-2">📷</div>
                    <div className="font-semibold text-sm">Photo</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPost({...newPost, type: 'video'})}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      newPost.type === 'video'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-3xl mb-2">🎥</div>
                    <div className="font-semibold text-sm">Vidéo</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPost({...newPost, type: 'audio'})}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      newPost.type === 'audio'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-3xl mb-2">🎵</div>
                    <div className="font-semibold text-sm">Audio</div>
                  </button>
                </div>
              </div>

              {/* Zone pour les médias (photo, vidéo, audio) */}
              {(newPost.type === 'image' || newPost.type === 'video' || newPost.type === 'audio') && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {newPost.type === 'image' ? '📷' : newPost.type === 'video' ? '🎥' : '🎵'} Fichier média
                  </label>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowMediaCapture(true)}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                        📷 Capturer
                    </button>
                      <label className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium cursor-pointer">
                        📁 Choisir un fichier
                    <input
                      type="file"
                      accept={newPost.type === 'image' ? 'image/*' : newPost.type === 'video' ? 'video/*' : 'audio/*'}
                      capture={newPost.type === 'image' || newPost.type === 'video' ? 'environment' : undefined}
                      onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {selectedFile && (
                      <div className="bg-white rounded-lg p-3 border border-green-300">
                        <p className="text-sm text-green-700 flex items-center gap-2">
                          <span>✓</span>
                          <span className="font-medium">Fichier sélectionné :</span>
                          <span>{selectedFile.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Zone pour le contenu texte */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contenu {newPost.type === 'text' && '*'}
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  placeholder={newPost.type === 'text' ? "Rédigez votre post scientifique..." : "Ajoutez une description ou un commentaire (optionnel)..."}
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCreatePost(false);
                  setShowMediaCapture(false);
                  setSelectedFile(null);
                  setNewPost({ title: '', content: '', type: 'text' });
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 px-4 rounded-lg transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => submitCreatePost()}
                disabled={
                  (newPost.type === 'image' || newPost.type === 'video' || newPost.type === 'audio') && !selectedFile
                }
                className={`flex-1 py-3 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                  (newPost.type === 'image' || newPost.type === 'video' || newPost.type === 'audio') && !selectedFile
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <span>📤</span>
                <span>Publier le post</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showMediaCapture && (
        <QuickMediaCapture
          onCapture={handleMediaCapture}
          onClose={() => setShowMediaCapture(false)}
          allowedTypes={newPost.type === 'text' ? ['photo', 'video', 'audio'] : [newPost.type === 'image' ? 'photo' : newPost.type]}
          autoPublish={true}
        />
      )}

      {/* Section Scientifiques & Chercheurs (approuvés par l'admin) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <ProSection
          type="scientist"
          title="Scientifiques & Chercheurs"
          icon="🔬"
          description=""
        />
      </div>

      {/* Formulaire d'octroi de permission (Admin uniquement) */}
      {showPermissionForm && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Accorder une permission de publication</h3>
              <button onClick={() => setShowPermissionForm(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Numéro H de l'utilisateur *</label>
                <input
                  type="text"
                  value={newPermission.numeroH}
                  onChange={(e) => setNewPermission({...newPermission, numeroH: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: G1C1P1R1E1F1 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date d'expiration (optionnel)</label>
                <input
                  type="date"
                  value={newPermission.expiresAt}
                  onChange={(e) => setNewPermission({...newPermission, expiresAt: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Laissez vide pour une permission permanente</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optionnel)</label>
                <textarea
                  value={newPermission.notes}
                  onChange={(e) => setNewPermission({...newPermission, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Notes sur la permission..."
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={grantPermission}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                >
                  ✅ Accorder la permission
                </button>
                <button
                  onClick={() => setShowPermissionForm(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  ❌ Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

