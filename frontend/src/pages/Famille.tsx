import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNumeroHForDisplay } from '../utils/auth';
import { calculerAge } from '../utils/calculs';

const API_BASE = (import.meta as any)?.env?.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5002';
const getImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `${API_BASE}${url}`;
};

type AlbumKey = 'rencontre' | 'bapteme' | 'mariage' | 'deces';
interface AlbumMedia { id?: string; url: string; type: 'image' | 'video'; uploadedAt: string; uploaderName?: string; uploaderNumeroH?: string; }
type GalleryAlbums = Record<AlbumKey, AlbumMedia[]>;

const ALBUMS_CONFIG: { key: AlbumKey; label: string; emoji: string; bg: string; light: string; text: string; border: string }[] = [
  { key: 'rencontre', label: 'Rencontre', emoji: '💑', bg: 'bg-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  { key: 'bapteme',  label: 'Baptême',   emoji: '👶', bg: 'bg-sky-500',    light: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200'    },
  { key: 'mariage',  label: 'Mariage',   emoji: '💍', bg: 'bg-amber-500',  light: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
  { key: 'deces',    label: 'Deuil',     emoji: '🕊️', bg: 'bg-slate-500',  light: 'bg-slate-50',  text: 'text-slate-700',  border: 'border-slate-200'  },
];

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  dateNaissance?: string;
  date_naissance?: string;
  [key: string]: any;
}

interface FamilyMember {
  id: string;
  numeroH: string;
  prenom: string;
  nomFamille: string;
  relation: string;
  phone?: string;
  email?: string;
  address?: string;
  birthDate?: string;
  isActive: boolean;
  createdAt: string;
  profilePicture?: string;
  occupation?: string;
  maritalStatus?: string;
  children?: number;
}

interface FamilyTree {
  id: string;
  rootMember: string;
  members: FamilyMember[];
  isActive: boolean;
  createdAt: string;
}

interface FamilyMessage {
  id: string;
  author: string;
  authorName: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  category?: 'information' | 'mariage' | 'bapteme' | 'deces' | 'reunion' | 'rencontre';
  createdAt: string;
}

interface FamilyTreeConfirmation {
  id: string;
  childNumeroH: string;
  parentNumeroH: string;
  parentType: 'pere' | 'mere';
  status: 'pending' | 'confirmed' | 'rejected';
  confirmedAt?: string;
  rejectedAt?: string;
  notes?: string;
  child?: {
    numeroH: string;
    prenom: string;
    nomFamille: string;
    dateNaissance?: string;
    photo?: string;
  };
}

interface FamilyTreeData {
  id: string;
  rootMember: string;
  chefFamille1?: string;
  chefFamille2?: string;
  members: any[];
  deceasedMembers: any[];
}

export default function Famille() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'parents' | 'enfants' | 'epoux' | 'freres' | 'soeurs' | 'oncles' | 'tantes' | 'cousins' | 'cousines' | 'neveux' | 'nieces' | 'grandparents' | 'arbre' | 'gestion'>('parents');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyTree, setFamilyTree] = useState<FamilyTree | null>(null);
  const [familyTreeData, setFamilyTreeData] = useState<FamilyTreeData | null>(null);
  const [pendingConfirmations, setPendingConfirmations] = useState<FamilyTreeConfirmation[]>([]);
  const [showSetHeadsForm, setShowSetHeadsForm] = useState(false);
  const [familyHeads, setFamilyHeads] = useState({
    chefFamille1: '',
    chefFamille2: ''
  });
  const [familyMessages, setFamilyMessages] = useState<FamilyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showTreeChat, setShowTreeChat] = useState(false);
  const [showFamilyGallery, setShowFamilyGallery] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const navigate = useNavigate();

  // État pour les photos de famille
  const [familyPhotos, setFamilyPhotos] = useState({
    familyPhoto: null as string | null,
    manPhoto: null as string | null,
    wifePhoto: null as string | null,
    childrenPhotos: [] as Array<{ name: string; photoUrl: string; uploadedAt: string }>
  });
  const [uploading, setUploading] = useState<string | null>(null);

  // Galerie albums
  const [galleryAlbums, setGalleryAlbums] = useState<GalleryAlbums>({ rencontre: [], bapteme: [], mariage: [], deces: [] });
  const [activeAlbum, setActiveAlbum] = useState<AlbumKey | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadingAlbum, setUploadingAlbum] = useState<string | null>(null);
  const [gallerySection, setGallerySection] = useState<'photos' | 'albums'>('photos');
  const [viewerMedia, setViewerMedia] = useState<AlbumMedia | null>(null);
  const [deletingGalleryIdx, setDeletingGalleryIdx] = useState<number | null>(null);

  const [newMember, setNewMember] = useState({
    numeroH: '',
    prenom: '',
    nomFamille: '',
    relation: '',
    phone: '',
    email: '',
    address: '',
    birthDate: '',
    occupation: '',
    maritalStatus: '',
    children: ''
  });

  const [newMessage, setNewMessage] = useState({
    content: '',
    type: 'text' as 'text' | 'image' | 'video' | 'audio',
    category: 'information' as 'information' | 'mariage' | 'bapteme' | 'deces' | 'reunion' | 'rencontre',
    mediaFile: null as File | null
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
      await Promise.all([
        loadFamilyMembers(),
        loadFamilyTree(),
        loadFamilyMessages(),
        loadFamilyPhotos(),
        loadFamilyTreeData(),
        loadPendingConfirmations(),
        loadGalleryAlbums()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFamilyPhotos = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/family/photos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        const raw = data.photos || {};
        setFamilyPhotos({
          familyPhoto: raw.familyPhoto ?? null,
          manPhoto: raw.manPhoto ?? null,
          wifePhoto: raw.wifePhoto ?? null,
          childrenPhotos: Array.isArray(raw.childrenPhotos) ? raw.childrenPhotos : []
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des photos:', error);
    }
  };

  const uploadPhoto = async (type: 'family' | 'man' | 'wife' | 'children', file: File, childName?: string) => {
    try {
      setUploading(type);
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('photo', file);
      if (childName) {
        formData.append('childName', childName);
      }

      const endpoint = type === 'children' ? `${API_BASE}/api/family/photos/children` : `${API_BASE}/api/family/photos/${type}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (type === 'children') {
          setFamilyPhotos(prev => ({
            ...prev,
            childrenPhotos: data.childrenPhotos || prev.childrenPhotos
          }));
        } else {
          const photoKey = type === 'family' ? 'familyPhoto' : type === 'man' ? 'manPhoto' : 'wifePhoto';
          setFamilyPhotos(prev => ({
            ...prev,
            [photoKey]: data.photoUrl
          }));
        }
        alert('Photo uploadée avec succès !');
      } else {
        alert('Erreur lors de l\'upload de la photo');
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      alert('Erreur lors de l\'upload de la photo');
    } finally {
      setUploading(null);
    }
  };

  const deleteChildPhoto = async (index: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/family/photos/children/${index}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFamilyPhotos(prev => ({
          ...prev,
          childrenPhotos: data.childrenPhotos || prev.childrenPhotos
        }));
        alert('Photo supprimée avec succès !');
      } else {
        alert('Erreur lors de la suppression de la photo');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de la photo');
    }
  };

  // ── Galerie albums ────────────────────────────────────────────────────────
  const loadGalleryAlbums = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/family/gallery`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // L'API retourne { success, albums: { rencontre:[], bapteme:[], mariage:[], deces:[] } }
        const raw = data.albums || {};
        setGalleryAlbums({
          rencontre: raw.rencontre || [],
          bapteme:   raw.bapteme   || [],
          mariage:   raw.mariage   || [],
          deces:     raw.deces     || [],
        });
      }
    } catch (error) {
      console.error('Erreur chargement galerie:', error);
    }
  };

  const uploadToAlbum = async (album: AlbumKey, file: File) => {
    try {
      setUploadingAlbum(album);
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('media', file);
      const response = await fetch(`${API_BASE}/api/family/gallery/${album}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        const raw = data.albums || {};
        setGalleryAlbums({
          rencontre: raw.rencontre || [],
          bapteme:   raw.bapteme   || [],
          mariage:   raw.mariage   || [],
          deces:     raw.deces     || [],
        });
      }
    } catch (error) {
      console.error('Erreur upload galerie:', error);
    } finally {
      setUploadingAlbum(null);
    }
  };

  const deleteFromAlbum = async (album: AlbumKey, idx: number) => {
    try {
      setDeletingGalleryIdx(idx);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/family/gallery/${album}/${idx}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const raw = data.albums || {};
        setGalleryAlbums({
          rencontre: raw.rencontre || [],
          bapteme:   raw.bapteme   || [],
          mariage:   raw.mariage   || [],
          deces:     raw.deces     || [],
        });
        setViewerMedia(null);
      }
    } catch (error) {
      console.error('Erreur suppression galerie:', error);
    } finally {
      setDeletingGalleryIdx(null);
    }
  };

  const isVideoUrl = (url: string) => /\.(mp4|webm|ogg)(\?|$)/i.test(url) || url.includes('video/');
  // ─────────────────────────────────────────────────────────────────────────

  const loadFamilyMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/family/members', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFamilyMembers(data.members || []);
      } else {
        setFamilyMembers(getDefaultFamilyMembers());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des membres:', error);
      setFamilyMembers(getDefaultFamilyMembers());
    }
  };

  const loadFamilyTreeData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/family-tree/tree', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFamilyTreeData(data.tree);
        if (data.tree) {
          setFamilyHeads({
            chefFamille1: data.tree.chefFamille1 || '',
            chefFamille2: data.tree.chefFamille2 || ''
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'arbre:', error);
    }
  };

  const loadPendingConfirmations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/family-tree/pending-confirmations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPendingConfirmations(data.confirmations || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des confirmations:', error);
    }
  };

  const confirmAccess = async (confirmationId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/family-tree/confirm-access/${confirmationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        alert('Accès confirmé avec succès !');
        loadPendingConfirmations();
        loadFamilyTreeData();
      } else {
        const data = await response.json();
        alert(data.message || 'Erreur lors de la confirmation');
      }
    } catch (error) {
      console.error('Erreur lors de la confirmation:', error);
      alert('Erreur lors de la confirmation');
    }
  };

  const rejectAccess = async (confirmationId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/family-tree/reject-access/${confirmationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        alert('Accès rejeté');
        loadPendingConfirmations();
      } else {
        const data = await response.json();
        alert(data.message || 'Erreur lors du rejet');
      }
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
      alert('Erreur lors du rejet');
    }
  };

  const saveFamilyHeads = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/family-tree/set-family-heads', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(familyHeads)
      });
      
      if (response.ok) {
        alert('Chefs de famille mis à jour avec succès !');
        setShowSetHeadsForm(false);
        loadFamilyTreeData();
      } else {
        const data = await response.json();
        alert(data.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const loadFamilyTree = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/family/tree', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFamilyTree(data.tree || getDefaultFamilyTree());
      } else {
        setFamilyTree(getDefaultFamilyTree());
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'arbre:', error);
      setFamilyTree(getDefaultFamilyTree());
    }
  };

  const loadFamilyMessages = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/family-tree/messages', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const msgs = (data.messages || []).map((m: any) => ({
          id: m.id,
          author: m.numeroH,
          authorName: m.authorName,
          content: m.content,
          type: m.messageType || 'text',
          mediaUrl: m.mediaUrl,
          createdAt: m.created_at || m.createdAt
        }));
        setFamilyMessages(msgs);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const getDefaultFamilyMembers = (): FamilyMember[] => [
    {
      id: '1',
      numeroH: 'PARENT001',
      prenom: 'Mamadou',
      nomFamille: 'Diallo',
      relation: 'Père',
      phone: '+224 123 456 789',
      email: 'mamadou.diallo@email.com',
      address: 'Conakry, Guinée',
      birthDate: '1960-05-15',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      occupation: 'Fonctionnaire',
      maritalStatus: 'Marié',
      children: 3
    },
    {
      id: '2',
      numeroH: 'PARENT002',
      prenom: 'Fatou',
      nomFamille: 'Camara',
      relation: 'Mère',
      phone: '+224 987 654 321',
      email: 'fatou.camara@email.com',
      address: 'Conakry, Guinée',
      birthDate: '1965-08-20',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      occupation: 'Enseignante',
      maritalStatus: 'Mariée',
      children: 3
    },
    {
      id: '3',
      numeroH: 'EPOUX001',
      prenom: 'Mariama',
      nomFamille: 'Bah',
      relation: 'Épouse',
      phone: '+224 555 123 456',
      email: 'mariama.bah@email.com',
      address: 'Conakry, Guinée',
      birthDate: '1990-12-10',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      occupation: 'Infirmière',
      maritalStatus: 'Mariée',
      children: 2
    }
  ];

  const getDefaultFamilyTree = (): FamilyTree => ({
    id: '1',
    rootMember: userData?.numeroH || '',
    members: getDefaultFamilyMembers(),
        isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  });

  const handleAddMember = () => {
        setNewMember({
          numeroH: '',
          prenom: '',
          nomFamille: '',
          relation: '',
          phone: '',
          email: '',
          address: '',
      birthDate: '',
      occupation: '',
      maritalStatus: '',
      children: ''
    });
    setShowAddMember(true);
  };

  const submitAddMember = async () => {
    if (!newMember.numeroH || !newMember.prenom || !newMember.nomFamille || !newMember.relation) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/family/members', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newMember)
      });

      if (response.ok) {
        alert('Membre de famille ajouté avec succès !');
        setShowAddMember(false);
        loadFamilyMembers();
      } else {
        alert('Erreur lors de l\'ajout du membre');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      alert('Erreur lors de l\'ajout du membre');
    }
  };

  const submitFamilyMessage = async () => {
    if (newMessage.type === 'text' && !newMessage.content.trim()) return;
    if (newMessage.type !== 'text' && !newMessage.mediaFile) return;

    try {
      const token = localStorage.getItem("token");

      if (newMessage.type === 'text') {
        const response = await fetch('/api/family-tree/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: newMessage.content, messageType: 'text' })
        });
        if (response.ok) {
          setNewMessage({ content: '', type: 'text', category: 'information', mediaFile: null });
          loadFamilyMessages();
        }
      } else {
        const formData = new FormData();
        if (newMessage.content) formData.append('content', newMessage.content);
        if (newMessage.mediaFile) formData.append('media', newMessage.mediaFile);
        const response = await fetch('/api/family-tree/messages/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (response.ok) {
          setNewMessage({ content: '', type: 'text', category: 'information', mediaFile: null });
          loadFamilyMessages();
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
    }
  };

  const getFamilyCategoryConfig = (cat?: string) => {
    switch (cat) {
      case 'mariage':    return { icon: '💍', label: 'Mariage',   color: 'bg-pink-100 text-pink-800' };
      case 'bapteme':    return { icon: '👶', label: 'Baptême',   color: 'bg-sky-100 text-sky-800' };
      case 'deces':      return { icon: '🕊️', label: 'Deuil',    color: 'bg-slate-200 text-slate-700' };
      case 'reunion':    return { icon: '👥', label: 'Réunion',   color: 'bg-indigo-100 text-indigo-800' };
      case 'rencontre':  return { icon: '🤝', label: 'Rencontre', color: 'bg-teal-100 text-teal-800' };
      default:           return { icon: 'ℹ️', label: 'Info',      color: 'bg-gray-100 text-gray-700' };
    }
  };

  const getMembersByRelation = (relation: string) => {
    return familyMembers.filter(member => member.relation === relation);
  };

  const getTabLabel = (tab: string) => {
    const labels: { [key: string]: string } = {
      'parents': 'Mes Parents',
      'enfants': 'Mes Enfants',
      'epoux': 'Ma Femme', // Changé de "Mes Femmes" à "Ma Femme"
      'freres': 'Mes Frères',
      'soeurs': 'Mes Sœurs',
      'oncles': 'Mes Oncles',
      'tantes': 'Mes Tantes',
      'cousins': 'Mes Cousins',
      'cousines': 'Mes Cousines',
      'neveux': 'Mes Neveux',
      'nieces': 'Mes Nièces',
      'grandparents': 'Mes Grands-Parents',
      'arbre': 'Mon Arbre',
      'gestion': 'Gestion'
    };
    return labels[tab] || tab;
  };

  const getTabIcon = (tab: string) => {
    const icons: { [key: string]: string } = {
      'parents': '👨‍👩‍👧‍👦',
      'enfants': '👶',
      'epoux': '👩‍❤️‍👨',
      'freres': '👨‍👦',
      'soeurs': '👩‍👧',
      'oncles': '👨‍💼',
      'tantes': '👩‍💼',
      'cousins': '👨‍🎓',
      'cousines': '👩‍🎓',
      'neveux': '👦',
      'nieces': '👧',
      'grandparents': '👴‍👵',
      'arbre': '🌳',
      'gestion': '⚙️'
    };
    return icons[tab] || '👤';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de la famille...</p>
        </div>
      </div>
    );
  }

  // Calcul de l'âge et droit de publier dans la galerie (>= 18 ans)
  // Si la date de naissance est inconnue, on autorise par défaut la publication
  const birth = userData?.dateNaissance || userData?.date_naissance;
  const age = birth ? (calculerAge(birth) ?? 0) : 99;
  const canPublishGallery = age >= 18;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shadow-lg p-2 border border-gray-200 overflow-hidden">
                {familyPhotos.familyPhoto ? (
                  <img 
                    src={getImageUrl(familyPhotos.familyPhoto) ?? ''} 
                    alt="Photo de famille" 
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      // Si l'image ne charge pas, afficher l'emoji
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent && !parent.querySelector('.fallback-emoji')) {
                        const emoji = document.createElement('span');
                        emoji.className = 'fallback-emoji text-4xl';
                        emoji.textContent = '👨‍👩‍👧‍👦';
                        parent.appendChild(emoji);
                      }
                    }}
                  />
                ) : (
                  <span className="text-4xl">👨‍👩‍👧‍👦</span>
                )}
              </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">👨‍👩‍👧‍👦 Famille</h1>
              <p className="mt-2 text-gray-600">Gérez votre famille et votre arbre généalogique</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleAddMember}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ➕ Ajouter un membre
              </button>
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

      {/* Galerie familiale — 4 albums */}
      <div className="bg-gradient-to-b from-white to-slate-50 border-b py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Galerie familiale</h2>
              <p className="text-sm text-gray-500 mt-1">Souvenirs et moments importants</p>
            </div>
            {!canPublishGallery && (
              <p className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 max-w-xs text-right">
                Publication réservée aux +18 ans
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {ALBUMS_CONFIG.map((cfg) => {
              const items = galleryAlbums[cfg.key] || [];
              const count = items.length;
              const thumb = items[0];
              return (
                <button
                  key={cfg.key}
                  onClick={() => {
                    setActiveAlbum(cfg.key);
                    setGallerySection('albums');
                    setShowFamilyGallery(true);
                  }}
                  className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left"
                >
                  {/* Couverture */}
                  <div className="aspect-[4/3] relative overflow-hidden">
                    {thumb ? (
                      thumb.type === 'video' ? (
                        <video
                          src={getImageUrl(thumb.url) || ''}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          muted
                        />
                      ) : (
                        <img
                          src={getImageUrl(thumb.url) || ''}
                          alt={cfg.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )
                    ) : (
                      <div className={`w-full h-full ${cfg.bg} flex items-center justify-center`}>
                        <span className="text-5xl opacity-80">{cfg.emoji}</span>
                      </div>
                    )}
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    {/* Compteur */}
                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-lg">
                      {count} élément{count !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Label */}
                  <div className="px-4 py-3 flex items-center gap-2">
                    <span className="text-xl">{cfg.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{cfg.label}</p>
                      <p className="text-xs text-slate-400">{count === 0 ? 'Vide' : `${count} photo${count > 1 ? 's' : ''}`}</p>
                    </div>
                    <svg className="ml-auto w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {['parents', 'enfants', 'epoux', 'freres', 'soeurs', 'oncles', 'tantes', 'cousins', 'cousines', 'neveux', 'nieces', 'grandparents', 'arbre', 'gestion'].map((tab) => (
            <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{getTabIcon(tab)}</span>
                {getTabLabel(tab)}
            </button>
          ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'arbre' ? (
          <div className="space-y-6">
            {/* Arbre généalogique - NE PAS MODIFIER */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🌳 Mon Arbre Généalogique</h2>
              <p className="text-gray-600 mb-6">
                Voici votre arbre généalogique. Cette section reste inchangée comme demandé.
              </p>
              
              {/* Arbre visuel simplifié */}
              <div className="flex justify-center items-center space-x-8 py-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl mb-2">
                    👴
                  </div>
                  <p className="text-sm font-medium">Grand-Père</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center text-2xl mb-2">
                    👵
                  </div>
                  <p className="text-sm font-medium">Grand-Mère</p>
                </div>
              </div>
              
              <div className="flex justify-center items-center space-x-4 py-4">
                <div className="w-1 h-8 bg-gray-300"></div>
                <div className="w-1 h-8 bg-gray-300"></div>
              </div>
              
              <div className="flex justify-center items-center space-x-8 py-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl mb-2">
                    👨
                  </div>
                  <p className="text-sm font-medium">Père</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center text-2xl mb-2">
                    👩
                  </div>
                  <p className="text-sm font-medium">Mère</p>
                </div>
              </div>
              
              <div className="flex justify-center items-center space-x-4 py-4">
                <div className="w-1 h-8 bg-gray-300"></div>
                <div className="w-1 h-8 bg-gray-300"></div>
              </div>
              
              <div className="flex justify-center items-center space-x-8 py-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-2xl mb-2">
                    👤
                  </div>
                  <p className="text-sm font-medium">Vous</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-2xl mb-2">
                    👩‍❤️‍👨
                  </div>
                  <p className="text-sm font-medium">Épouse</p>
                </div>
        </div>

              {/* Boutons pour l'arbre */}
              <div className="flex justify-center flex-wrap gap-4 mt-8">
                <button
                  onClick={() => setShowTreeChat(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  💬 Chat Familial
                </button>
                <button
                  onClick={() => setShowFamilyGallery(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  🖼️ Galerie famille
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'gestion' ? (
          <div className="space-y-6">
            {/* Section Confirmations en attente */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🔐 Confirmations en attente</h2>
              <p className="text-gray-600 mb-6">
                Des enfants ont demandé l'accès à l'arbre familial. Veuillez confirmer ou rejeter leurs demandes.
              </p>
              
              {pendingConfirmations.length > 0 ? (
                <div className="space-y-4">
                  {pendingConfirmations.map((confirmation) => (
                    <div key={confirmation.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                              {confirmation.parentType === 'pere' ? '👨' : '👩'}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {confirmation.child?.prenom} {confirmation.child?.nomFamille}
                              </h3>
                              <p className="text-sm text-gray-600">
                                NumeroH: {confirmation.childNumeroH}
                              </p>
                              <p className="text-sm text-gray-500">
                                Demande d'accès en tant que {confirmation.parentType === 'pere' ? 'fils/fille du père' : 'fils/fille de la mère'}
                              </p>
                            </div>
                          </div>
                          {confirmation.child?.dateNaissance && (
                            <p className="text-sm text-gray-500 ml-15">
                              Date de naissance: {new Date(confirmation.child.dateNaissance).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirmAccess(confirmation.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            ✅ Confirmer
                          </button>
                          <button
                            onClick={() => rejectAccess(confirmation.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                          >
                            ❌ Rejeter
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-lg font-medium text-gray-900 mb-2">Aucune confirmation en attente</p>
                  <p className="text-gray-600">Toutes les demandes d'accès ont été traitées.</p>
                </div>
              )}
            </div>

            {/* Section Chefs de famille */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">👑 Chefs de famille</h2>
                  <p className="text-gray-600 mt-2">
                    Nommez deux chefs de famille pour maintenir l'arbre généalogique. Seuls les chefs actuels ou les administrateurs peuvent modifier cette liste.
                  </p>
                </div>
                <button
                  onClick={() => setShowSetHeadsForm(true)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  ✏️ Modifier
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center text-2xl">
                        👑
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Chef de famille 1</h3>
                        <p className="text-sm text-gray-600">
                          {familyTreeData?.chefFamille1 ? (
                            <span className="font-mono">{familyTreeData.chefFamille1}</span>
                          ) : (
                            <span className="text-gray-400">Non défini</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center text-2xl">
                        👑
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Chef de famille 2</h3>
                        <p className="text-sm text-gray-600">
                          {familyTreeData?.chefFamille2 ? (
                            <span className="font-mono">{familyTreeData.chefFamille2}</span>
                          ) : (
                            <span className="text-gray-400">Non défini</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Formulaire pour nommer les chefs de famille */}
              {showSetHeadsForm && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Nommer les chefs de famille</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chef de famille 1 (NumeroH) *
                      </label>
                      <input
                        type="text"
                        value={familyHeads.chefFamille1}
                        onChange={(e) => setFamilyHeads({...familyHeads, chefFamille1: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Ex: G1C1P1R1E1F1 1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chef de famille 2 (NumeroH) (optionnel)
                      </label>
                      <input
                        type="text"
                        value={familyHeads.chefFamille2}
                        onChange={(e) => setFamilyHeads({...familyHeads, chefFamille2: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Ex: G1C1P1R1E1F1 2"
                      />
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={saveFamilyHeads}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        ✅ Enregistrer
                      </button>
                      <button
                        onClick={() => setShowSetHeadsForm(false)}
                        className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        ❌ Annuler
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Informations sur l'arbre */}
            {familyTreeData && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Informations sur l'arbre</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {familyTreeData.members?.length || 0}
                    </div>
                    <div className="text-sm text-blue-800">Membres vivants</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-gray-600 mb-2">
                      {familyTreeData.deceasedMembers?.length || 0}
                    </div>
                    <div className="text-sm text-gray-800">Membres décédés</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {(familyTreeData.members?.length || 0) + (familyTreeData.deceasedMembers?.length || 0)}
                    </div>
                    <div className="text-sm text-purple-800">Total membres</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {getTabIcon(activeTab)} {getTabLabel(activeTab)}
              </h2>
              
              {getMembersByRelation(activeTab).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getMembersByRelation(activeTab).map((member) => {
                    const isCurrentUser = userData?.numeroH && String(member.numeroH).trim() === String(userData.numeroH).trim();
                    return (
                    <div key={member.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl mr-3 overflow-hidden">
                          {member.profilePicture ? (
                            <img src={member.profilePicture} alt="" className="w-full h-full object-cover" />
                          ) : (
                            getTabIcon(activeTab)
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {member.prenom} {member.nomFamille}
                          </h3>
                          <p className="text-sm text-gray-600">{getNumeroHForDisplay(member.numeroH, isCurrentUser)}</p>
                        </div>
                      </div>

                      {isCurrentUser && (
                        <>
                          <div className="space-y-2 mb-4">
                            {member.phone && (
                              <div className="flex items-center text-sm text-gray-600">
                                <span className="mr-2">📞</span>
                                <span>{member.phone}</span>
                              </div>
                            )}
                            {member.email && (
                              <div className="flex items-center text-sm text-gray-600">
                                <span className="mr-2">📧</span>
                                <span>{member.email}</span>
                              </div>
                            )}
                            {member.address && (
                              <div className="flex items-center text-sm text-gray-600">
                                <span className="mr-2">📍</span>
                                <span>{member.address}</span>
                              </div>
                            )}
                            {member.occupation && (
                              <div className="flex items-center text-sm text-gray-600">
                                <span className="mr-2">💼</span>
                                <span>{member.occupation}</span>
                              </div>
                            )}
                            {member.birthDate && (
                              <div className="flex items-center text-sm text-gray-600">
                                <span className="mr-2">🎂</span>
                                <span>{new Date(member.birthDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex space-x-2">
                            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                              Contacter
                            </button>
                            <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
                              Modifier
                            </button>
                          </div>
                        </>
                      )}
                      {!isCurrentUser && (
                        <p className="text-xs text-gray-500">Pour l'identification : nom, NumeroH et photo. Les autres informations sont privées.</p>
                      )}
                    </div>
                    );
                  })}
            </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">{getTabIcon(activeTab)}</div>
                  <p className="text-gray-500 mb-4">Aucun membre dans cette catégorie</p>
              <button
                    onClick={handleAddMember}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                    Ajouter un membre
              </button>
                </div>
            )}
          </div>
          </div>
        )}
        </div>

      {/* Modal d'ajout de membre */}
        {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">➕ Ajouter un Membre de Famille</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NumeroH</label>
                <input
                  type="text"
                  value={newMember.numeroH}
                  onChange={(e) => setNewMember({...newMember, numeroH: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="NumeroH du membre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                <select
                  value={newMember.relation}
                  onChange={(e) => setNewMember({...newMember, relation: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner une relation</option>
                  <option value="Père">Père</option>
                  <option value="Mère">Mère</option>
                  <option value="Épouse">Épouse</option>
                  <option value="Fils">Fils</option>
                  <option value="Fille">Fille</option>
                  <option value="Frère">Frère</option>
                  <option value="Sœur">Sœur</option>
                  <option value="Oncle">Oncle</option>
                  <option value="Tante">Tante</option>
                  <option value="Cousin">Cousin</option>
                  <option value="Cousine">Cousine</option>
                  <option value="Neveu">Neveu</option>
                  <option value="Nièce">Nièce</option>
                  <option value="Grand-Père">Grand-Père</option>
                  <option value="Grand-Mère">Grand-Mère</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  type="text"
                  value={newMember.prenom}
                  onChange={(e) => setNewMember({...newMember, prenom: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Prénom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de famille</label>
                <input
                  type="text"
                  value={newMember.nomFamille}
                  onChange={(e) => setNewMember({...newMember, nomFamille: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom de famille"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+224 XXX XXX XXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={newMember.address}
                  onChange={(e) => setNewMember({...newMember, address: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Adresse complète"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                <input
                  type="date"
                  value={newMember.birthDate}
                  onChange={(e) => setNewMember({...newMember, birthDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
                <input
                  type="text"
                  value={newMember.occupation}
                  onChange={(e) => setNewMember({...newMember, occupation: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Profession"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut marital</label>
                <select
                  value={newMember.maritalStatus}
                  onChange={(e) => setNewMember({...newMember, maritalStatus: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  value={newMember.children}
                  onChange={(e) => setNewMember({...newMember, children: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                    </div>
                  </div>
            <div className="flex space-x-3 mt-6">
                    <button
                onClick={() => setShowAddMember(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
                  </button>
                  <button
                onClick={submitAddMember}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                Ajouter
                  </button>
                </div>
              </div>
            </div>
      )}

      {/* Modal de chat familial — Messagerie Professionnelle */}
      {showTreeChat && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl" style={{ height: '85vh', maxHeight: '680px' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-green-600 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👨‍👩‍👧‍👦</span>
                <div>
                  <h3 className="font-bold text-white text-base">Messagerie Familiale</h3>
                  <p className="text-green-100 text-xs">Espace privé entre membres de la famille</p>
                </div>
              </div>
              <button onClick={() => setShowTreeChat(false)} className="text-white hover:text-green-200 text-2xl font-light">✕</button>
            </div>

            {/* Légende catégories */}
            <div className="px-4 py-2 bg-gray-50 border-b flex gap-2 flex-wrap items-center">
              <span className="text-xs text-gray-500 font-medium">Catégories :</span>
              {[
                { icon: 'ℹ️', label: 'Info' },
                { icon: '💍', label: 'Mariage' },
                { icon: '👶', label: 'Baptême' },
                { icon: '🕊️', label: 'Deuil' },
                { icon: '👥', label: 'Réunion' },
                { icon: '🤝', label: 'Rencontre' },
              ].map(c => (
                <span key={c.label} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-600">
                  {c.icon} {c.label}
                </span>
              ))}
            </div>

            {/* Zone messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-100">
              {familyMessages.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-5xl mb-3">💬</div>
                  <p className="font-medium">Aucun message pour le moment.</p>
                  <p className="text-sm mt-1">Soyez le premier à écrire à votre famille !</p>
                </div>
              )}
              {familyMessages.map((message) => {
                const isMe = message.author === userData?.numeroH;
                const catCfg = getFamilyCategoryConfig(message.category);
                return (
                  <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-2.5 shadow-sm ${isMe ? 'bg-green-500 text-white' : 'bg-white text-gray-900'}`}>
                      {!isMe && <p className="text-xs font-semibold mb-0.5 opacity-80">{message.authorName}</p>}
                      {/* Badge catégorie */}
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mb-1.5 ${isMe ? 'bg-green-400 text-white' : catCfg.color}`}>
                        {catCfg.icon} {catCfg.label}
                      </span>
                      {message.content && <p className="text-sm">{message.content}</p>}
                      {message.type === 'image' && message.mediaUrl && (
                        <img src={message.mediaUrl} alt="Photo" className="max-w-full rounded-lg mt-1" />
                      )}
                      {message.type === 'video' && message.mediaUrl && (
                        <video src={message.mediaUrl} controls className="max-w-full rounded-lg mt-1" />
                      )}
                      {message.type === 'audio' && message.mediaUrl && (
                        <audio src={message.mediaUrl} controls className="w-full mt-1" />
                      )}
                      <p className={`text-xs mt-1 ${isMe ? 'text-green-100' : 'text-gray-400'}`}>
                        {new Date(message.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Zone saisie professionnelle */}
            <div className="px-4 py-3 bg-white border-t space-y-2 rounded-b-2xl">
              {/* Ligne catégorie + type média */}
              <div className="flex gap-2 flex-wrap">
                <select
                  value={newMessage.category}
                  onChange={e => setNewMessage({...newMessage, category: e.target.value as any})}
                  className="flex-1 min-w-[140px] border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-gray-50 focus:ring-2 focus:ring-green-500"
                >
                  <option value="information">ℹ️ Information</option>
                  <option value="mariage">💍 Mariage</option>
                  <option value="bapteme">👶 Baptême</option>
                  <option value="deces">🕊️ Deuil / Décès</option>
                  <option value="reunion">👥 Réunion</option>
                  <option value="rencontre">🤝 Rencontre</option>
                </select>
                <select
                  value={newMessage.type}
                  onChange={e => setNewMessage({...newMessage, type: e.target.value as any, mediaFile: null})}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-gray-50 focus:ring-2 focus:ring-green-500"
                >
                  <option value="text">📝 Texte</option>
                  <option value="image">🖼️ Photo</option>
                  <option value="video">🎥 Vidéo</option>
                  <option value="audio">🎙️ Audio</option>
                </select>
              </div>
              {/* Zone saisie selon le type */}
              <div className="flex gap-2 items-end">
                {newMessage.type === 'text' ? (
                  <input
                    type="text"
                    value={newMessage.content}
                    onChange={e => setNewMessage({...newMessage, content: e.target.value})}
                    onKeyPress={e => e.key === 'Enter' && submitFamilyMessage()}
                    placeholder="Écrivez un message familial..."
                    className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                ) : newMessage.type === 'audio' ? (
                  <div className="flex-1 flex items-center gap-2">
                    {newMessage.mediaFile ? (
                      <div className="flex items-center gap-2 flex-1 px-3 py-2 bg-green-50 border border-green-200 rounded-full">
                        <span className="text-sm text-green-700 flex-1">🎙️ Audio prêt</span>
                        <button type="button" onClick={() => setNewMessage({...newMessage, mediaFile: null})} className="text-red-500 text-xs">✕</button>
                      </div>
                    ) : (
                      <label className="flex-1 cursor-pointer">
                        <input type="file" accept="audio/*" className="hidden"
                          onChange={e => setNewMessage({...newMessage, mediaFile: e.target.files?.[0] || null})} />
                        <span className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 border border-gray-200">
                          🎙️ Choisir un fichier audio
                        </span>
                      </label>
                    )}
                  </div>
                ) : (
                  <label className="flex-1 cursor-pointer">
                    <input type="file"
                      accept={newMessage.type === 'image' ? 'image/*' : 'video/*'}
                      className="hidden"
                      onChange={e => setNewMessage({...newMessage, mediaFile: e.target.files?.[0] || null})} />
                    <span className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 border border-gray-200">
                      {newMessage.type === 'image' ? '🖼️' : '🎥'} {newMessage.mediaFile ? newMessage.mediaFile.name : 'Choisir un fichier'}
                    </span>
                  </label>
                )}
                <button
                  onClick={submitFamilyMessage}
                  disabled={newMessage.type === 'text' ? !newMessage.content.trim() : !newMessage.mediaFile}
                  className="w-10 h-10 flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-full text-lg transition-colors flex-shrink-0"
                >
                  ➤
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Galerie famille — design professionnel */}
      {showFamilyGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-slate-50 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl shadow-xl border border-slate-200">
            {/* En-tête */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">Galerie de la famille</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Photos et souvenirs partagés</p>
                </div>
              </div>
              <button
                onClick={() => { setShowFamilyGallery(false); setGallerySection('photos'); setViewerMedia(null); }}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                aria-label="Fermer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {!canPublishGallery && (
              <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <span>La publication est réservée aux membres de 18 ans ou plus. Vous pouvez consulter la galerie.</span>
              </div>
            )}

            {/* Onglets */}
            <div className="flex gap-1 px-6 pt-4 pb-0 bg-white border-b border-slate-200">
              <button
                onClick={() => setGallerySection('photos')}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                  gallerySection === 'photos'
                    ? 'bg-slate-50 text-slate-900 border border-slate-200 border-b-0 -mb-px'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
                }`}
              >
                Photos de famille
              </button>
              <button
                onClick={() => { setGallerySection('albums'); if (!activeAlbum) setActiveAlbum('rencontre'); }}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                  gallerySection === 'albums'
                    ? 'bg-slate-50 text-slate-900 border border-slate-200 border-b-0 -mb-px'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
                }`}
              >
                Albums famille
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50">
              {gallerySection === 'photos' && (
                <div className="p-6">
                  <p className="text-sm text-slate-600 mb-5">Photos partagées par les chefs de famille.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[
                      { key: 'family', label: 'Photo de famille', photo: familyPhotos.familyPhoto, icon: '👨‍👩‍👧‍👦' },
                      { key: 'man', label: 'Mon Homme', photo: familyPhotos.manPhoto, icon: '👨' },
                      { key: 'wife', label: 'Ma Femme', photo: familyPhotos.wifePhoto, icon: '👩' },
                    ].map(({ key, label, photo, icon }) => (
                      <div key={key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 pt-3 pb-2">{label}</p>
                        <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center">
                          {photo ? (
                            <img src={getImageUrl(photo) ?? ''} alt={label} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl text-slate-300 select-none">{icon}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 pt-3 pb-2">Enfants</p>
                    <div className="p-4 flex flex-wrap gap-4">
                      {(familyPhotos.childrenPhotos?.length ?? 0) > 0 ? (
                        (familyPhotos.childrenPhotos ?? []).map((child, index) => (
                          <div key={index} className="w-24 text-center">
                            <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 mb-1.5">
                              <img src={getImageUrl(child.photoUrl) ?? ''} alt={child.name} className="w-full h-full object-cover" />
                            </div>
                            <span className="text-xs font-semibold text-slate-700 truncate block w-full">{child.name}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400 py-2">Aucune photo d'enfant pour le moment.</p>
                      )}
                    </div>
                  </div>
                  {canPublishGallery && (
                    <p className="mt-4 text-xs text-slate-500">Pour ajouter des photos, utilisez la section « Photos de Famille » en bas de la page.</p>
                  )}
                </div>
              )}

              {gallerySection === 'albums' && (
                <div className="flex flex-col sm:flex-row h-full min-h-[400px]">
                  {/* Sidebar albums */}
                  <div className="sm:w-60 flex-shrink-0 bg-white border-b sm:border-b-0 sm:border-r border-slate-200">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Albums</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Visible par toute la famille</p>
                    </div>
                    <div className="flex sm:flex-col overflow-x-auto sm:overflow-x-visible p-2 gap-1">
                      {ALBUMS_CONFIG.map((cfg) => {
                        const items = galleryAlbums[cfg.key] || [];
                        const count = items.length;
                        const thumb = items[0];
                        const isActive = activeAlbum === cfg.key;
                        return (
                          <button
                            key={cfg.key}
                            onClick={() => setActiveAlbum(cfg.key)}
                            className={`flex items-center gap-3 min-w-[170px] sm:min-w-0 w-full px-3 py-2.5 rounded-xl text-left transition-all ${
                              isActive
                                ? `${cfg.light} ${cfg.border} border`
                                : 'hover:bg-slate-50 border border-transparent'
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ${isActive ? cfg.bg : 'bg-slate-100'} flex items-center justify-center`}>
                              {thumb ? (
                                thumb.type === 'video' ? (
                                  <video src={getImageUrl(thumb.url) || ''} className="w-full h-full object-cover" muted />
                                ) : (
                                  <img src={getImageUrl(thumb.url) || ''} alt="" className="w-full h-full object-cover" />
                                )
                              ) : (
                                <span className={`text-2xl ${isActive ? '' : 'opacity-60'}`}>{cfg.emoji}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-semibold truncate ${isActive ? cfg.text : 'text-slate-800'}`}>{cfg.label}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{count === 0 ? 'Vide' : `${count} photo${count > 1 ? 's' : ''}`}</p>
                            </div>
                            {isActive && <div className={`w-1.5 h-8 rounded-full ${cfg.bg} flex-shrink-0`} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contenu album */}
                  <div className="flex-1 flex flex-col min-h-0">
                    {activeAlbum && (() => {
                      const cfg = ALBUMS_CONFIG.find((c) => c.key === activeAlbum)!;
                      const items = galleryAlbums[activeAlbum] || [];
                      return (
                        <>
                          {/* En-tête album avec couleur */}
                          <div className={`${cfg.bg} px-5 py-4 flex items-center justify-between flex-shrink-0`}>
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{cfg.emoji}</span>
                              <div>
                                <h4 className="text-base font-bold text-white">{cfg.label}</h4>
                                <p className="text-xs text-white/70">
                                  {items.length === 0 ? 'Aucun contenu' : `${items.length} élément${items.length > 1 ? 's' : ''}`}
                                </p>
                              </div>
                            </div>
                            {canPublishGallery && (
                              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white/20 hover:bg-white/30 text-white transition-colors border border-white/30">
                                {uploadingAlbum === activeAlbum ? (
                                  <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Envoi…
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Ajouter
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept="image/*,video/*"
                                  multiple
                                  className="hidden"
                                  disabled={!!uploadingAlbum}
                                  onChange={async (e) => {
                                    const files = Array.from(e.target.files || []);
                                    for (const f of files) await uploadToAlbum(activeAlbum, f);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            )}
                          </div>

                          {/* Grille photos */}
                          <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                            {items.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-slate-200 bg-white">
                                <span className="text-6xl mb-4 opacity-20">{cfg.emoji}</span>
                                <p className="text-sm font-semibold text-slate-600">Cet album est vide</p>
                                {canPublishGallery
                                  ? <p className="text-xs text-slate-400 mt-1">Cliquez sur « Ajouter » pour partager un souvenir</p>
                                  : <p className="text-xs text-slate-400 mt-1">Aucun contenu partagé pour le moment</p>}
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {items.map((item, idx) => (
                                  <div
                                    key={item.id || idx}
                                    className="relative group aspect-square rounded-xl overflow-hidden bg-slate-200 shadow-sm ring-1 ring-slate-200/50 hover:ring-2 hover:ring-indigo-300 transition-all cursor-pointer"
                                    onClick={() => setViewerMedia(item)}
                                  >
                                    {item.type === 'video' ? (
                                      <video src={getImageUrl(item.url) || ''} className="w-full h-full object-cover" muted />
                                    ) : (
                                      <img src={getImageUrl(item.url) || ''} alt="" className="w-full h-full object-cover" />
                                    )}

                                    {/* Badge vidéo */}
                                    {item.type === 'video' && (
                                      <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1 pointer-events-none">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                                        Vidéo
                                      </span>
                                    )}

                                    {/* Nom de l'auteur */}
                                    {item.uploaderName && (
                                      <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-lg truncate max-w-[75%] pointer-events-none">
                                        {item.uploaderName}
                                      </span>
                                    )}

                                    {/* Bouton supprimer (propriétaire uniquement) */}
                                    {canPublishGallery && item.uploaderNumeroH === userData?.numeroH && (
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); deleteFromAlbum(activeAlbum, idx); }}
                                          disabled={deletingGalleryIdx === idx}
                                          className="w-8 h-8 rounded-lg bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow transition-colors"
                                          aria-label="Supprimer"
                                        >
                                          {deletingGalleryIdx === idx ? (
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                          ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                          )}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visionneuse plein écran */}
      {viewerMedia && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/95 p-4"
          onClick={() => setViewerMedia(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setViewerMedia(null)}
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {viewerMedia.type === 'video' || isVideoUrl(viewerMedia.url) ? (
            <video
              src={getImageUrl(viewerMedia.url) || ''}
              controls
              autoPlay
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={getImageUrl(viewerMedia.url) || ''}
              alt=""
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

    </div>
  );
}