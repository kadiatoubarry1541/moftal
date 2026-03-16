import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../../config/api';

const API_BASE_URL = config.API_BASE_URL || 'http://localhost:5002/api';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  genre?: string;
  dateNaissance?: string;
  date_naissance?: string;
  role?: string;
  [key: string]: any;
}

export default function Inspir() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [orgActiveSubTab, setOrgActiveSubTab] = useState<'hommes' | 'femmes' | 'enfants'>('hommes');
  const [orgMessages, setOrgMessages] = useState<any[]>([]);
  const [isRecordingOrg, setIsRecordingOrg] = useState(false);
  const [mediaRecorderOrg, setMediaRecorderOrg] = useState<MediaRecorder | null>(null);
  const messagesEndRefOrg = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [newOrgPost, setNewOrgPost] = useState({
    content: '',
    type: 'text' as 'text' | 'image' | 'video' | 'audio',
    category: 'information' as 'information' | 'rencontre' | 'opportunite' | 'outil' | 'reunion',
    mediaFile: null as File | null
  });

  const calculateAge = (dateNaissance: string | undefined): number | null => {
    if (!dateNaissance) return null;
    const birthDate = new Date(dateNaissance);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const isAdmin = userData?.role === 'admin' || userData?.role === 'Admin' || userData?.role === 'ADMIN';

  const getAutoOrgSubTab = (): 'hommes' | 'femmes' | 'enfants' => {
    if (!userData) return 'hommes';
    const dateNaissance = userData.dateNaissance || userData.date_naissance;
    const age = calculateAge(dateNaissance);
    if (age !== null && age < 18) return 'enfants';
    const genre = userData.genre?.toUpperCase();
    if (genre === 'HOMME' || genre === 'M' || genre === 'MASCULIN' || genre === 'MALE') return 'hommes';
    if (genre === 'FEMME' || genre === 'F' || genre === 'FEMININ' || genre === 'FEMALE') return 'femmes';
    return 'hommes';
  };

  const currentOrgSubTab = useMemo(() => {
    if (isAdmin) return orgActiveSubTab;
    return getAutoOrgSubTab();
  }, [userData, isAdmin, orgActiveSubTab]);

  useEffect(() => {
    if (!isAdmin && userData) {
      const autoTab = getAutoOrgSubTab();
      setOrgActiveSubTab(autoTab);
    }
  }, [userData, isAdmin]);

  useEffect(() => {
    const session = localStorage.getItem("session_user");
    if (!session) { navigate("/login"); return; }
    try {
      const parsed = JSON.parse(session);
      const user = parsed.userData || parsed;
      if (!user || !user.numeroH) { navigate("/login"); return; }
      setUserData(user);
      setLoading(false);
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const getCategoryLogo = (category: string) => {
    switch (category) {
      case 'information': return '\u2139\uFE0F';
      case 'rencontre': return '\uD83E\uDD1D';
      case 'opportunite': return '\uD83C\uDF1F';
      case 'outil': return '\uD83D\uDEE0\uFE0F';
      case 'reunion': return '\uD83D\uDC65';
      default: return '\u2139\uFE0F';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'information': return 'Information';
      case 'rencontre': return 'Rencontre';
      case 'opportunite': return 'Opportunit\u00E9';
      case 'outil': return 'Outil de travail';
      case 'reunion': return 'R\u00E9union';
      default: return 'Information';
    }
  };

  const loadOrgMessages = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/organizations/posts?category=demographie&subcategory=${currentOrgSubTab}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrgMessages((data.posts || []).reverse());
        setTimeout(() => {
          messagesEndRefOrg.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const sendOrgMessage = async () => {
    if (newOrgPost.type === 'text' && !newOrgPost.content.trim()) {
      alert('Veuillez entrer un message');
      return;
    }
    if (newOrgPost.type !== 'text' && !newOrgPost.mediaFile) {
      alert('Veuillez s\u00E9lectionner un fichier m\u00E9dia');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('content', newOrgPost.content);
      formData.append('messageType', newOrgPost.type);
      formData.append('category', 'demographie');
      formData.append('subcategory', currentOrgSubTab);
      formData.append('postCategory', newOrgPost.category);
      if (newOrgPost.mediaFile) {
        formData.append('media', newOrgPost.mediaFile);
      }
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/organizations/create-post`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.post) {
          setNewOrgPost({ content: '', type: 'text', category: 'information', mediaFile: null });
          await loadOrgMessages();
          setTimeout(() => {
            messagesEndRefOrg.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        } else {
          alert('Erreur lors de l\'envoi du message');
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Erreur lors de l\'envoi du message' }));
        const msg = errorData.message || `Erreur ${response.status}: ${response.statusText}`;
        if (response.status === 404 && (msg.includes('Route non trouvée') || msg.includes('non trouv'))) {
          alert('Route API non trouvée. Vérifiez que le backend est bien démarré (npm run start dans le dossier backend) et redémarrez la page.');
        } else {
          alert(msg);
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      if (error.message === 'Failed to fetch' || error.name === 'TypeError' || error.message?.includes('fetch')) {
        alert(`Erreur de connexion: Impossible de se connecter au serveur.\n\nV\u00E9rifiez que:\n1. Le backend est d\u00E9marr\u00E9 sur le port 5002\n2. L'URL ${API_BASE_URL} est correcte\n3. Votre connexion internet fonctionne`);
      } else {
        alert(`Erreur: ${error.message || 'Impossible d\'envoyer le message.'}`);
      }
    }
  };

  const startRecordingOrg = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'audio-recording.webm', { type: 'audio/webm' });
        setNewOrgPost({ ...newOrgPost, type: 'audio', mediaFile: audioFile });
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorderOrg(recorder);
      setIsRecordingOrg(true);
    } catch (error) {
      console.error('Erreur lors de l\'acc\u00E8s au micro:', error);
      alert('Impossible d\'acc\u00E9der au micro. V\u00E9rifiez les permissions.');
    }
  };

  const stopRecordingOrg = () => {
    if (mediaRecorderOrg && isRecordingOrg) {
      mediaRecorderOrg.stop();
      setIsRecordingOrg(false);
      setMediaRecorderOrg(null);
    }
  };

  useEffect(() => {
    if (userData) {
      loadOrgMessages();
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible' && !document.hidden) {
          loadOrgMessages();
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [currentOrgSubTab, userData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm border-b rounded-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm text-gray-800"
              >
                <span className="text-lg leading-none mr-1">←</span>
                Retour
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {'\uD83E\uDD1D'} Inspir
                </h1>
                <p className="mt-1 text-gray-600">
                  {currentOrgSubTab === 'hommes' ? 'Hommes' :
                    currentOrgSubTab === 'femmes' ? 'Femmes' :
                    'Enfants (Moins de 18 ans)'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation pour Admin - Afficher les 3 onglets */}
      {isAdmin && (
        <div className="bg-white border-b rounded-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              {[
                { id: 'hommes', label: 'Hommes', icon: '\uD83D\uDC68\u200D\uD83D\uDC68' },
                { id: 'femmes', label: 'Femmes', icon: '\uD83E\uDDD5\uD83C\uDFFF\uD83E\uDDD5\uD83C\uDFFB' },
                { id: 'enfants', label: 'Enfants (Moins de 18 ans)', icon: '\uD83D\uDC6B\uD83C\uDFFF' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setOrgActiveSubTab(tab.id as 'hommes' | 'femmes' | 'enfants')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    currentOrgSubTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Titre de la section — photo de profil si disponible, sinon icône */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-3xl mr-4 flex-shrink-0 border-2 border-white shadow-md">
            {userData?.photo ? (
              <img src={userData.photo.startsWith('http') ? userData.photo : (userData.photo.startsWith('/') ? userData.photo : '/' + userData.photo)} alt="Profil" className="w-full h-full object-cover" />
            ) : (
              <span>
                {currentOrgSubTab === 'hommes' && '\uD83D\uDC68\u200D\uD83D\uDC68'}
                {currentOrgSubTab === 'femmes' && '\uD83E\uDDD5\uD83C\uDFFF\uD83E\uDDD5\uD83C\uDFFB'}
                {currentOrgSubTab === 'enfants' && '\uD83D\uDC6B\uD83C\uDFFF'}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentOrgSubTab === 'hommes' && 'Hommes'}
              {currentOrgSubTab === 'femmes' && 'Femmes'}
              {currentOrgSubTab === 'enfants' && 'Enfants (Moins de 18 ans)'}
            </h2>
            <p className="text-gray-600 mt-1">
              {currentOrgSubTab === 'hommes' && 'Inspir d\u00E9di\u00E9e aux hommes'}
              {currentOrgSubTab === 'femmes' && 'Inspir d\u00E9di\u00E9e aux femmes'}
              {currentOrgSubTab === 'enfants' && 'Inspir d\u00E9di\u00E9e aux enfants de moins de 18 ans'}
            </p>
          </div>
        </div>
      </div>

      {/* Interface de publication */}
      <div className="mt-4 bg-white rounded-lg shadow-lg overflow-hidden" style={{ minHeight: '500px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        {/* Zone de messages */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4" style={{ minHeight: '300px', maxHeight: 'calc(70vh - 200px)' }}>
          {orgMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>Aucun message pour le moment.</p>
            </div>
          ) : (
            orgMessages.map((msg) => {
              const isMyMessage = msg.numeroH === userData?.numeroH || msg.author === userData?.numeroH;
              return (
                <div
                  key={msg.id}
                  className={`mb-4 flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isMyMessage
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-900'
                    }`}
                  >
                    {!isMyMessage && (
                      <p className="text-xs font-semibold mb-1 opacity-75">{msg.authorName || msg.author || msg.numeroH}</p>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{getCategoryLogo(msg.category || msg.postCategory || 'information')}</span>
                      <span className={`text-xs font-medium ${isMyMessage ? 'text-green-100' : 'text-gray-600'}`}>
                        {getCategoryName(msg.category || msg.postCategory || 'information')}
                      </span>
                    </div>
                    {msg.messageType === 'text' && msg.content && (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    {msg.messageType === 'image' && msg.mediaUrl && (
                      <img
                        src={`${API_BASE_URL.replace('/api', '')}${msg.mediaUrl}`}
                        alt="Image"
                        className="max-w-full h-auto rounded-lg mb-1"
                      />
                    )}
                    {msg.messageType === 'video' && msg.mediaUrl && (
                      <video
                        src={`${API_BASE_URL.replace('/api', '')}${msg.mediaUrl}`}
                        controls
                        className="max-w-full h-auto rounded-lg mb-1"
                      />
                    )}
                    {msg.messageType === 'audio' && msg.mediaUrl && (
                      <audio
                        src={`${API_BASE_URL.replace('/api', '')}${msg.mediaUrl}`}
                        controls
                        className="w-full mb-1"
                      />
                    )}
                    <p className={`text-xs mt-1 ${isMyMessage ? 'text-green-100' : 'text-gray-500'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRefOrg} />
        </div>

        {/* Zone de saisie */}
        <div className="bg-gray-200 px-4 py-2 border-t">
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={newOrgPost.category}
                onChange={(e) => setNewOrgPost({...newOrgPost, category: e.target.value as any})}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
              >
                <option value="information">{'\u2139\uFE0F'} Information</option>
                <option value="rencontre">{'\uD83E\uDD1D'} Rencontre</option>
                <option value="opportunite">{'\uD83C\uDF1F'} Opportunit{'\u00E9'}</option>
                <option value="outil">{'\uD83D\uDEE0\uFE0F'} Outil de travail</option>
                <option value="reunion">{'\uD83D\uDC65'} R{'\u00E9'}union</option>
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex gap-2 flex-1">
                <select
                  value={newOrgPost.type}
                  onChange={(e) => {
                    setNewOrgPost({...newOrgPost, type: e.target.value as any, mediaFile: null});
                    if (e.target.value !== 'audio' && isRecordingOrg) {
                      stopRecordingOrg();
                    }
                  }}
                  className="px-2 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                >
                  <option value="text">{'\uD83D\uDCDD'}</option>
                  <option value="image">{'\uD83D\uDDBC\uFE0F'}</option>
                  <option value="video">{'\uD83C\uDFA5'}</option>
                  <option value="audio">{'\uD83C\uDFB5'}</option>
                </select>
                {newOrgPost.type === 'text' ? (
                  <input
                    type="text"
                    value={newOrgPost.content}
                    onChange={(e) => setNewOrgPost({...newOrgPost, content: e.target.value})}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendOrgMessage();
                      }
                    }}
                    placeholder="Tapez un message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                ) : newOrgPost.type === 'audio' ? (
                  <div className="flex gap-2 flex-1 items-center">
                    {!isRecordingOrg && !newOrgPost.mediaFile ? (
                      <>
                        <button
                          type="button"
                          onClick={startRecordingOrg}
                          className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center gap-2"
                        >
                          {'\uD83C\uDFA4'} Enregistrer
                        </button>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (file) {
                              setNewOrgPost({...newOrgPost, type: 'audio', mediaFile: file});
                            } else {
                              setNewOrgPost({...newOrgPost, mediaFile: null});
                            }
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        />
                      </>
                    ) : isRecordingOrg ? (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-100 rounded-lg">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-red-700">Enregistrement...</span>
                        </div>
                        <button
                          type="button"
                          onClick={stopRecordingOrg}
                          className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                        >
                          {'\u23F9\uFE0F'} Arr{'\u00EA'}ter
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm text-gray-600">Audio pr{'\u00EA'}t</span>
                        <button
                          type="button"
                          onClick={() => setNewOrgPost({...newOrgPost, mediaFile: null})}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          {'\u2715'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="file"
                    accept={newOrgPost.type === 'image' ? 'image/*' : 'video/*'}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        let detectedType = newOrgPost.type;
                        if (file.type.startsWith('image/')) detectedType = 'image';
                        else if (file.type.startsWith('video/')) detectedType = 'video';
                        else if (file.type.startsWith('audio/')) detectedType = 'audio';
                        setNewOrgPost({...newOrgPost, type: detectedType, mediaFile: file});
                      } else {
                        setNewOrgPost({...newOrgPost, mediaFile: null});
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                  />
                )}
              </div>
              <button
                onClick={sendOrgMessage}
                disabled={newOrgPost.type === 'text' ? !newOrgPost.content.trim() : !newOrgPost.mediaFile}
                className="bg-green-600 text-white px-6 py-2 rounded-full hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {'\u25B6'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
