import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { getNumeroHForDisplay } from '../../utils/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  [key: string]: any;
}

interface Friend {
  id: string;
  numeroH: string;
  prenom: string;
  nomFamille: string;
  email?: string;
  phone?: string;
  status: 'pending' | 'accepted' | 'blocked';
  requestedAt: string;
  acceptedAt?: string;
  mutualFriends: number;
  commonInterests: string[];
  bio?: string;
  location?: string;
  occupation?: string;
  hobbies?: string[];
  lastSeen?: string;
  isOnline?: boolean;
  profilePicture?: string;
}

interface FriendRequest {
  id: string;
  fromUser: string;
  fromUserName: string;
  toUser: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  respondedAt?: string;
}

interface UserInfo {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  email?: string;
  phone?: string;
  bio?: string;
  location?: string;
  occupation?: string;
  hobbies?: string[];
  interests?: string[];
  education?: string;
  birthDate?: string;
  maritalStatus?: string;
  children?: number;
  languages?: string[];
  profilePicture?: string;
  isPublic: boolean;
}

interface MesAmoursStory {
  id: number;
  numeroH: string;
  authorName: string;
  content: string;
  photos: string[];
  videos: string[];
  publishedAt: string;
}

export default function MesAmours() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'info'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showEditInfo, setShowEditInfo] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  const [addFriendForm, setAddFriendForm] = useState({
    numeroH: '',
    message: ''
  });

  // Modes d'ajout d'ami
  const [addMode, setAddMode] = useState<'numeroh' | 'phone' | 'qr'>('numeroh');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneResult, setPhoneResult] = useState<{ numeroH: string; prenom: string; nomFamille: string } | null>(null);
  const [phoneSearchLoading, setPhoneSearchLoading] = useState(false);
  const [phoneSearchError, setPhoneSearchError] = useState('');
  const [qrSubMode, setQrSubMode] = useState<'show' | 'scan'>('show');
  const [qrScannerActive, setQrScannerActive] = useState(false);
  const [qrScannedUser, setQrScannedUser] = useState<{ numeroH: string; prenom: string; nomFamille: string } | null>(null);
  const [qrScanError, setQrScanError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanLoopRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [editInfoForm, setEditInfoForm] = useState({
    bio: '',
    location: '',
    occupation: '',
    hobbies: '',
    interests: '',
    education: '',
    birthDate: '',
    maritalStatus: '',
    children: '',
    languages: '',
    isPublic: true
  });

  // Stories Mes Amours (type Facebook/WhatsApp)
  const [stories, setStories] = useState<MesAmoursStory[]>([]);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyMessage, setStoryMessage] = useState('');
  const [uploadingStory, setUploadingStory] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("session_user");
    if (!session) {
      return;
    }

    try {
      const parsed = JSON.parse(session);
      const user = parsed.userData || parsed;
      if (!user || !user.numeroH) {
        return;
      }
      
      setUserData(user);
      loadData();
    } catch {
      // Ignore
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadFriends(),
        loadFriendRequests(),
        loadUserInfo(),
        loadStories()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/friends/list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des amis:', error);
      setFriends([]);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/friends/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFriendRequests(data.requests || []);
      } else {
        setFriendRequests([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
      setFriendRequests([]);
    }
  };

  const loadUserInfo = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/user/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.info || getDefaultUserInfo());
      } else {
        setUserInfo(getDefaultUserInfo());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des informations:', error);
      setUserInfo(getDefaultUserInfo());
    }
  };

  const loadStories = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setStories([]);
        return;
      }
      const response = await fetch(`${API_BASE}/api/user-stories/mes-amours/feed`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      } else {
        setStories([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stories Mes Amours:', error);
      setStories([]);
    }
  };

  const handleStoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setStoryFile(file);
  };

  const submitStory = async () => {
    if (!storyFile) return;

    try {
      const token = localStorage.getItem("token");
      if (!token || !userData?.numeroH) {
        alert("Vous devez être connecté pour publier une story.");
        return;
      }

      const formData = new FormData();
      formData.append('file', storyFile);
      if (storyMessage.trim()) {
        formData.append('content', storyMessage.trim());
      }

      setUploadingStory(true);
      const response = await fetch(`${API_BASE}/api/user-stories/mes-amours/story`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      } as any);

      const data = await response.json();
      if (response.ok && data.success) {
        setStoryFile(null);
        setStoryMessage('');
        await loadStories();
      } else {
        alert(data?.message || 'Erreur lors de la publication de la story');
      }
    } catch (error) {
      console.error('Erreur lors de la publication de la story:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setUploadingStory(false);
    }
  };

  const getDefaultFriends = (): Friend[] => [
    {
      id: '1',
      numeroH: 'FRIEND001',
      prenom: 'Fatou',
      nomFamille: 'Camara',
      email: 'fatou.camara@email.com',
      phone: '+224 123 456 789',
      status: 'accepted',
      requestedAt: '2024-01-15T10:00:00Z',
      acceptedAt: '2024-01-15T10:30:00Z',
      mutualFriends: 5,
      commonInterests: ['Musique', 'Voyage'],
      bio: 'Passionnée de musique et de voyage',
      location: 'Conakry',
      occupation: 'Enseignante',
      hobbies: ['Chant', 'Danse', 'Lecture'],
      lastSeen: '2024-01-20T15:30:00Z',
      isOnline: true,
      profilePicture: '/api/placeholder/100/100'
    },
    {
      id: '2',
      numeroH: 'FRIEND002',
      prenom: 'Alpha',
      nomFamille: 'Diallo',
      email: 'alpha.diallo@email.com',
      phone: '+224 987 654 321',
      status: 'accepted',
      requestedAt: '2024-01-10T09:00:00Z',
      acceptedAt: '2024-01-10T09:15:00Z',
      mutualFriends: 3,
      commonInterests: ['Sport', 'Cinéma'],
      bio: 'Sportif et cinéphile',
      location: 'Kindia',
      occupation: 'Ingénieur',
      hobbies: ['Football', 'Cinéma', 'Gaming'],
      lastSeen: '2024-01-20T12:00:00Z',
      isOnline: false,
      profilePicture: '/api/placeholder/100/100'
    }
  ];

  const getDefaultFriendRequests = (): FriendRequest[] => [
    {
      id: '1',
      fromUser: 'REQUEST001',
      fromUserName: 'Mariama Bah',
      toUser: userData?.numeroH || '',
      message: 'Salut ! J\'aimerais être ton amie',
      status: 'pending',
      createdAt: '2024-01-20T14:00:00Z'
    },
    {
      id: '2',
      fromUser: 'REQUEST002',
      fromUserName: 'Ousmane Barry',
      toUser: userData?.numeroH || '',
      message: 'Bonjour, nous avons des amis en commun',
      status: 'pending',
      createdAt: '2024-01-19T16:30:00Z'
    }
  ];

  const getDefaultUserInfo = (): UserInfo => ({
    numeroH: userData?.numeroH || '',
    prenom: userData?.prenom || '',
    nomFamille: userData?.nomFamille || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    bio: 'Partagez vos informations personnelles',
    location: '',
    occupation: '',
    hobbies: [],
    interests: [],
    education: '',
    birthDate: '',
    maritalStatus: '',
    children: 0,
    languages: [],
    profilePicture: '/api/placeholder/200/200',
    isPublic: true
  });

  const stopQRScanner = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setQrScannerActive(false);
  }, []);

  const startQRScanner = useCallback(async () => {
    setQrScanError('');
    setQrScannedUser(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setQrScannerActive(true);
      // On attend que videoRef soit attaché au DOM
      setTimeout(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        const scan = () => {
          if (!videoRef.current || !canvasRef.current) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code && code.data.startsWith('ADAM://friend/')) {
              const scannedNumeroH = code.data.replace('ADAM://friend/', '').trim();
              stopQRScanner();
              fetchUserByNumeroH(scannedNumeroH);
              return;
            }
          }
          scanLoopRef.current = requestAnimationFrame(scan);
        };
        scanLoopRef.current = requestAnimationFrame(scan);
      }, 200);
    } catch {
      setQrScanError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  }, [stopQRScanner]);

  const fetchUserByNumeroH = (numeroH: string) => {
    // On affiche le numeroH scanné et laisse send-request valider l'existence
    setQrScannedUser({ numeroH, prenom: '', nomFamille: '' });
    setAddFriendForm(f => ({ ...f, numeroH }));
  };

  const searchByPhone = async () => {
    if (!phoneInput.trim()) return;
    setPhoneSearchLoading(true);
    setPhoneSearchError('');
    setPhoneResult(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/friends/search-by-phone?tel=${encodeURIComponent(phoneInput.trim())}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPhoneResult(data.user);
      } else {
        setPhoneSearchError(data.message || 'Aucun utilisateur trouvé');
      }
    } catch {
      setPhoneSearchError('Erreur de connexion');
    } finally {
      setPhoneSearchLoading(false);
    }
  };

  const sendFriendFromPhoneResult = async () => {
    if (!phoneResult) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/friends/send-request`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUser: phoneResult.numeroH, message: addFriendForm.message?.trim() || undefined })
      });
      const data = await response.json();
      if (response.ok) {
        alert('Demande d\'amitié envoyée !');
        setShowAddFriend(false);
        setPhoneResult(null);
        setPhoneInput('');
        loadFriendRequests();
      } else {
        alert(data?.message || 'Erreur lors de l\'envoi');
      }
    } catch {
      alert('Erreur de connexion');
    }
  };

  const sendFriendFromQR = async () => {
    if (!qrScannedUser) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/friends/send-request`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUser: qrScannedUser.numeroH })
      });
      const data = await response.json();
      if (response.ok) {
        alert('Demande d\'amitié envoyée !');
        setShowAddFriend(false);
        setQrScannedUser(null);
        loadFriendRequests();
      } else {
        alert(data?.message || 'Erreur lors de l\'envoi');
      }
    } catch {
      alert('Erreur de connexion');
    }
  };

  const handleAddFriend = () => {
    setAddFriendForm({ numeroH: '', message: '' });
    setAddMode('numeroh');
    setPhoneInput('');
    setPhoneResult(null);
    setPhoneSearchError('');
    setQrSubMode('show');
    setQrScannedUser(null);
    setQrScanError('');
    setShowAddFriend(true);
  };

  const submitAddFriend = async () => {
    if (!addFriendForm.numeroH) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Vous devez être connecté pour envoyer une demande d'amitié.");
        return;
      }

      const response = await fetch(`${API_BASE}/api/friends/send-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toUser: addFriendForm.numeroH.trim(),
          message: addFriendForm.message?.trim() || undefined
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert('Demande d\'amitié envoyée avec succès !');
        setShowAddFriend(false);
        setAddFriendForm({ numeroH: '', message: '' });
        loadFriendRequests();
      } else {
        alert(data?.message || 'Erreur lors de l\'envoi de la demande');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      alert('Erreur de connexion au serveur');
    }
  };

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/friends/respond-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId,
          action
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert(action === 'accept' ? 'Demande acceptée ! Il apparaît maintenant dans votre liste d\'amis.' : 'Demande rejetée');
        await loadFriendRequests();
        await loadFriends();
      } else {
        alert(data?.message || 'Erreur lors de la réponse');
      }
    } catch (error) {
      console.error('Erreur lors de la réponse:', error);
      alert('Erreur de connexion au serveur');
    }
  };

  const handleViewFriendInfo = (friend: Friend) => {
    setSelectedFriend(friend);
    setShowInfoModal(true);
  };

  const handleEditInfo = () => {
    if (userInfo) {
      setEditInfoForm({
        bio: userInfo.bio || '',
        location: userInfo.location || '',
        occupation: userInfo.occupation || '',
        hobbies: userInfo.hobbies?.join(', ') || '',
        interests: userInfo.interests?.join(', ') || '',
        education: userInfo.education || '',
        birthDate: userInfo.birthDate || '',
        maritalStatus: userInfo.maritalStatus || '',
        children: userInfo.children?.toString() || '',
        languages: userInfo.languages?.join(', ') || '',
        isPublic: userInfo.isPublic
      });
      setShowEditInfo(true);
    }
  };

  const submitEditInfo = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/user/update-info`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bio: editInfoForm.bio,
          location: editInfoForm.location,
          occupation: editInfoForm.occupation,
          hobbies: editInfoForm.hobbies.split(',').map(h => h.trim()).filter(h => h),
          interests: editInfoForm.interests.split(',').map(i => i.trim()).filter(i => i),
          education: editInfoForm.education,
          birthDate: editInfoForm.birthDate,
          maritalStatus: editInfoForm.maritalStatus,
          children: parseInt(editInfoForm.children) || 0,
          languages: editInfoForm.languages.split(',').map(l => l.trim()).filter(l => l),
          isPublic: editInfoForm.isPublic
        })
      });

      if (response.ok) {
        alert('Informations mises à jour !');
        setShowEditInfo(false);
        loadUserInfo();
      } else {
        alert('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de vos amours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bouton Retour */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Link
            to="/famille"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
          >
            <span aria-hidden>←</span>
            Retour à Famille
          </Link>
        </div>
      </div>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">💕 Amitié</h1>
              <Link to="/famille/inspir" className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-sm font-medium rounded-lg transition-colors border border-yellow-300">
                🤝 Inspir
              </Link>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleAddFriend}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ➕ Ajouter un ami
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'friends', label: 'Mes Amis', icon: '👥' },
              { id: 'requests', label: 'Demandes', icon: '📨' },
              { id: 'info', label: 'Informations', icon: 'ℹ️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600'
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'friends' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">👥 Ma Liste d'Amis</h2>
              {friends.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">Vous n'avez pas encore d'amis</p>
                  <p className="text-gray-400 text-sm mt-2">Utilisez le bouton "Ajouter un ami" pour envoyer une demande</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {friends.map((friend) => (
                  <div key={friend.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-4">
                      <div className="relative">
                        <img
                          src={friend.profilePicture || '/api/placeholder/60/60'}
                          alt={`${friend.prenom} ${friend.nomFamille}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        {friend.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="ml-3">
                        <h3 className="font-semibold text-gray-900">
                          {friend.prenom} {friend.nomFamille}
                        </h3>
                        <p className="text-sm text-gray-600">{getNumeroHForDisplay(friend.numeroH, false)}</p>
                        {friend.isOnline ? (
                          <p className="text-xs text-green-600">En ligne</p>
                        ) : (
                          <p className="text-xs text-gray-500">
                            Vu {new Date(friend.lastSeen || '').toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {friend.bio && (
                      <p className="text-sm text-gray-600 mb-3">{friend.bio}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      {friend.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">📍</span>
                          <span>{friend.location}</span>
                        </div>
                      )}
                      {friend.occupation && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">💼</span>
                          <span>{friend.occupation}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">👥</span>
                        <span>{friend.mutualFriends} amis en commun</span>
                      </div>
                    </div>

                    {friend.commonInterests.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Intérêts communs:</h4>
                        <div className="flex flex-wrap gap-1">
                          {friend.commonInterests.map((interest, index) => (
                            <span key={index} className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs">
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewFriendInfo(friend)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg transition-colors"
                      >
                        Voir infos
                      </button>
                      <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
                        Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📨 Demandes d'Amitié</h2>
              <div className="space-y-4">
                {friendRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {request.fromUserName}
                        </h3>
                        {request.message && (
                          <p className="text-gray-600 mb-3">{request.message}</p>
                        )}
                        <p className="text-sm text-gray-500">
                          Demande envoyée le: {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleFriendRequest(request.id, 'accept')}
                          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          ✓ Accepter
                        </button>
                        <button
                          onClick={() => handleFriendRequest(request.id, 'reject')}
                          className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          ✗ Rejeter
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {friendRequests.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Aucune demande d'amitié en attente</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">📢 Story Mes Amours (24h)</h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleStoryFileChange}
                    className="block w-full text-xs sm:text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    disabled={!storyFile || uploadingStory}
                    onClick={submitStory}
                    className="inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium shadow-sm transition-colors"
                  >
                    {uploadingStory ? 'Publication...' : '📤 Publier'}
                  </button>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-3">
                Choisis <strong>une photo</strong> ou <strong>une courte vidéo</strong> et publie ta story. Elle sera
                visible par toi et tes amis pendant <strong>24 heures</strong>.
              </p>

              {stories.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-400 text-sm">
                  Aucune story active pour le moment. Publie ta première story Mes Amours.
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">Stories de toi et de tes amis (24h)</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {stories.map((story) => {
                      const mediaUrl =
                        (story.photos && story.photos[0]) ||
                        (story.videos && story.videos[0]) ||
                        '';
                      const isVideo = mediaUrl?.toLowerCase().match(/\\.mp4$|\\.webm$|\\.ogg$/);
                      return (
                        <div
                          key={story.id}
                          className="flex-shrink-0 w-32 sm:w-40 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden shadow-sm"
                        >
                          <div className="relative w-full h-32 bg-black/5 flex items-center justify-center overflow-hidden">
                            {mediaUrl ? (
                              isVideo ? (
                                <video src={mediaUrl} className="w-full h-full object-cover" muted autoPlay loop />
                              ) : (
                                <img src={mediaUrl} alt={story.authorName} className="w-full h-full object-cover" />
                              )
                            ) : (
                              <span className="text-gray-400 text-xs px-2 text-center">
                                Story sans média
                              </span>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {story.authorName}
                            </p>
                            {story.content && (
                              <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">
                                {story.content}
                              </p>
                            )}
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(story.publishedAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal d'ajout d'ami */}
      {showAddFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="text-xl font-bold text-gray-900">➕ Ajouter un Ami</h3>
              <button onClick={() => { stopQRScanner(); setShowAddFriend(false); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {/* Tabs mode */}
            <div className="flex border-b mx-6 mb-4">
              {([
                { key: 'numeroh', label: '🔢 NumeroH' },
                { key: 'phone',   label: '📞 Téléphone' },
                { key: 'qr',      label: '📷 QR Code' },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { stopQRScanner(); setAddMode(tab.key); setPhoneResult(null); setPhoneSearchError(''); setQrScannedUser(null); setQrScanError(''); }}
                  className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${addMode === tab.key ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="px-6 pb-6 space-y-4">

              {/* ── Mode NumeroH ── */}
              {addMode === 'numeroh' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NumeroH de l'ami</label>
                    <input
                      type="text"
                      value={addFriendForm.numeroH}
                      onChange={(e) => setAddFriendForm({...addFriendForm, numeroH: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: H-2024-XXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message (optionnel)</label>
                    <textarea
                      value={addFriendForm.message}
                      onChange={(e) => setAddFriendForm({...addFriendForm, message: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      rows={2}
                      placeholder="Message d'invitation..."
                    />
                  </div>
                  <div className="flex space-x-3 pt-2">
                    <button onClick={() => setShowAddFriend(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition-colors">Annuler</button>
                    <button onClick={submitAddFriend} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg transition-colors">Envoyer</button>
                  </div>
                </>
              )}

              {/* ── Mode Téléphone ── */}
              {addMode === 'phone' && (
                <>
                  <p className="text-sm text-gray-500">Saisissez le numéro de téléphone de la personne pour la trouver.</p>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => { setPhoneInput(e.target.value); setPhoneResult(null); setPhoneSearchError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && searchByPhone()}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="+224 6XX XXX XXX"
                    />
                    <button
                      onClick={searchByPhone}
                      disabled={phoneSearchLoading || !phoneInput.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      {phoneSearchLoading ? '...' : 'Chercher'}
                    </button>
                  </div>

                  {phoneSearchError && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{phoneSearchError}</p>
                  )}

                  {phoneResult && (
                    <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center text-emerald-700 font-bold text-lg">
                          {phoneResult.prenom?.[0] || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{phoneResult.prenom} {phoneResult.nomFamille}</p>
                          <p className="text-xs text-gray-500">{phoneResult.numeroH}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Message (optionnel)</label>
                        <textarea
                          value={addFriendForm.message}
                          onChange={(e) => setAddFriendForm(f => ({ ...f, message: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          rows={2}
                          placeholder="Message d'invitation..."
                        />
                      </div>
                      <button
                        onClick={sendFriendFromPhoneResult}
                        className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg transition-colors text-sm font-medium"
                      >
                        Envoyer l'invitation
                      </button>
                    </div>
                  )}

                  {!phoneResult && !phoneSearchError && (
                    <div className="flex justify-end pt-2">
                      <button onClick={() => setShowAddFriend(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors text-sm">Annuler</button>
                    </div>
                  )}
                </>
              )}

              {/* ── Mode QR Code ── */}
              {addMode === 'qr' && (
                <>
                  {/* Sous-tabs : Mon QR / Scanner */}
                  <div className="flex rounded-lg overflow-hidden border border-gray-200">
                    <button
                      onClick={() => { stopQRScanner(); setQrSubMode('show'); setQrScannedUser(null); setQrScanError(''); }}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${qrSubMode === 'show' ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                      📱 Mon QR Code
                    </button>
                    <button
                      onClick={() => { setQrSubMode('scan'); }}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${qrSubMode === 'scan' ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                      📷 Scanner
                    </button>
                  </div>

                  {/* Mon QR Code */}
                  {qrSubMode === 'show' && userData?.numeroH && (
                    <div className="flex flex-col items-center gap-3 py-2">
                      <div className="bg-white border-4 border-emerald-500 rounded-xl p-3 shadow-md">
                        <QRCodeSVG
                          value={`ADAM://friend/${userData.numeroH}`}
                          size={180}
                          level="M"
                          marginSize={0}
                        />
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{userData.prenom} {userData.nomFamille}</p>
                      <p className="text-xs text-gray-500">Fais scanner ce QR pour qu'on t'ajoute</p>
                    </div>
                  )}

                  {/* Scanner QR */}
                  {qrSubMode === 'scan' && (
                    <div className="flex flex-col items-center gap-3">
                      {!qrScannerActive && !qrScannedUser && (
                        <button
                          onClick={startQRScanner}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-medium transition-colors"
                        >
                          📷 Activer la caméra
                        </button>
                      )}

                      {qrScannerActive && (
                        <div className="w-full relative">
                          <video ref={videoRef} className="w-full rounded-lg" playsInline muted />
                          <canvas ref={canvasRef} className="hidden" />
                          <div className="absolute inset-0 border-2 border-emerald-400 rounded-lg pointer-events-none" />
                          <p className="text-center text-sm text-gray-500 mt-2">Pointez vers un QR Code Adam...</p>
                          <button
                            onClick={stopQRScanner}
                            className="mt-2 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm"
                          >
                            Arrêter
                          </button>
                        </div>
                      )}

                      {qrScanError && (
                        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 w-full">{qrScanError}</p>
                      )}

                      {qrScannedUser && (
                        <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4 w-full">
                          <p className="text-sm font-medium text-gray-700 mb-1">Profil trouvé :</p>
                          <p className="font-semibold text-gray-900">{qrScannedUser.prenom || qrScannedUser.numeroH}</p>
                          <p className="text-xs text-gray-500 mb-3">{qrScannedUser.numeroH}</p>
                          <button
                            onClick={sendFriendFromQR}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium"
                          >
                            Envoyer l'invitation
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button onClick={() => { stopQRScanner(); setShowAddFriend(false); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors text-sm">Fermer</button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Modal d'informations d'ami — autres membres : nom, NumeroH et photo uniquement */}
      {showInfoModal && selectedFriend && (() => {
        const isCurrentUser = userData?.numeroH && String(selectedFriend.numeroH).trim() === String(userData.numeroH).trim();
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              ℹ️ Informations de {selectedFriend.prenom} {selectedFriend.nomFamille}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <img
                  src={selectedFriend.profilePicture || '/api/placeholder/60/60'}
                  alt={`${selectedFriend.prenom} ${selectedFriend.nomFamille}`}
                  className="w-16 h-16 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {selectedFriend.prenom} {selectedFriend.nomFamille}
                  </h4>
                  <p className="text-sm text-gray-600">{getNumeroHForDisplay(selectedFriend.numeroH, isCurrentUser)}</p>
                </div>
              </div>

              {!isCurrentUser && (
                <p className="text-sm text-gray-500">Pour l'identification : nom, NumeroH et photo. Les autres informations sont privées.</p>
              )}

              {isCurrentUser && (
                <>
                  {selectedFriend.bio && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                      <p className="text-gray-900">{selectedFriend.bio}</p>
                    </div>
                  )}

                  {selectedFriend.location && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                      <p className="text-gray-900">{selectedFriend.location}</p>
                    </div>
                  )}

                  {selectedFriend.occupation && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
                      <p className="text-gray-900">{selectedFriend.occupation}</p>
                    </div>
                  )}

                  {selectedFriend.hobbies && selectedFriend.hobbies.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hobbies</label>
                      <div className="flex flex-wrap gap-1">
                        {selectedFriend.hobbies.map((hobby, index) => (
                          <span key={index} className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs">
                            {hobby}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amis en commun</label>
                    <p className="text-gray-900">{selectedFriend.mutualFriends}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Intérêts communs</label>
                    <div className="flex flex-wrap gap-1">
                      {selectedFriend.commonInterests.map((interest, index) => (
                        <span key={index} className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowInfoModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Fermer
              </button>
              <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
                Envoyer un message
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Modal d'édition des informations */}
      {showEditInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">✏️ Modifier mes Informations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  value={editInfoForm.bio}
                  onChange={(e) => setEditInfoForm({...editInfoForm, bio: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                <input
                  type="text"
                  value={editInfoForm.location}
                  onChange={(e) => setEditInfoForm({...editInfoForm, location: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
                <input
                  type="text"
                  value={editInfoForm.occupation}
                  onChange={(e) => setEditInfoForm({...editInfoForm, occupation: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Éducation</label>
                <input
                  type="text"
                  value={editInfoForm.education}
                  onChange={(e) => setEditInfoForm({...editInfoForm, education: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                <input
                  type="date"
                  value={editInfoForm.birthDate}
                  onChange={(e) => setEditInfoForm({...editInfoForm, birthDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut marital</label>
                <select
                  value={editInfoForm.maritalStatus}
                  onChange={(e) => setEditInfoForm({...editInfoForm, maritalStatus: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Sélectionner</option>
                  <option value="Célibataire">Célibataire</option>
                  <option value="Marié(e)">Marié(e)</option>
                  <option value="Divorcé(e)">Divorcé(e)</option>
                  <option value="Veuf/Veuve">Veuf/Veuve</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'enfants</label>
                <input
                  type="number"
                  value={editInfoForm.children}
                  onChange={(e) => setEditInfoForm({...editInfoForm, children: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hobbies (séparés par des virgules)</label>
                <input
                  type="text"
                  value={editInfoForm.hobbies}
                  onChange={(e) => setEditInfoForm({...editInfoForm, hobbies: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Musique, Sport, Lecture"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Intérêts (séparés par des virgules)</label>
                <input
                  type="text"
                  value={editInfoForm.interests}
                  onChange={(e) => setEditInfoForm({...editInfoForm, interests: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Voyage, Cinéma, Art"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Langues (séparées par des virgules)</label>
                <input
                  type="text"
                  value={editInfoForm.languages}
                  onChange={(e) => setEditInfoForm({...editInfoForm, languages: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Français, Anglais, Soussou"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editInfoForm.isPublic}
                    onChange={(e) => setEditInfoForm({...editInfoForm, isPublic: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Rendre mes informations publiques</span>
                </label>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditInfo(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={submitEditInfo}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

